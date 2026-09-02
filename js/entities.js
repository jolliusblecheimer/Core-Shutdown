// Player, the Scrapper, the NPC, items, bullets, dialogue, mission, trading.
const player = {
  x: 6.5, y: 26.5, r: 0.22,
  hp: 100, maxHp: 100,
  angle: 0,
  moving: false, animT: 0, frame: 0,
  fireCd: 0, muzzle: 0,
  swing: 0, swingCd: 0,
  iframes: 0, flash: 0, dead: 0,
  combatT: 99,                 // seconds since last combat — passive regen after 20
  melee: null,                 // EQUIPPED melee: null | 'pipe' | 'knife'
  hasGun: false,               // hasGun = a gun is EQUIPPED
  // WHAT IS IN THE GUN, AND WHAT IS IN YOUR POCKET, per gun. `loaded` is the
  // number on the HUD — the rounds you can fire before you have to stop — and
  // `reserve` is loose ammunition waiting to go in. See design/reloading.md.
  arms: {
    pistol: { loaded: 0, reserve: 0 },
    rifle:  { loaded: 0, reserve: 0 },
  },
  reloadT: 0, reloadOf: null,
  burst: 0, burstT: 0,          // rounds still owed by a burst, and when the next one goes
  burstCd: 0,                   // and how long until the right hand can ask again
  reloadWanted: false,          // R pressed mid-burst: honoured the moment it ends
  gun: 'pistol',               // WHICH gun, the same way `melee` picks the melee
  active: 'melee',             // which equipped weapon LMB uses (scroll to switch)
  scrollHintT: 0,              // "scroll" HUD hint: 30s after getting the gun, then gone
  owned: { pipe: false, knife: false, pistol: false, rifle: false },
  inv: { scrap: 0, tech: 0, snack: 0, mreBeef: 0, mreChicken: 0, gateKey: false, rifleBroken: 0 },
  // WHERE YOU WAKE UP, and which map that is. The area matters as much as the
  // coordinates: before this existed, dying anywhere in the ring put you back
  // in the junkyard, because the respawn point was two numbers with no map
  // attached and the only map it could have meant was the one it was written
  // for. A save with no `respawnArea` in it is from before that and is a
  // junkyard save by definition.
  respawnX: 6.5, respawnY: 26.5, respawnArea: 'junkyard', homeSet: false,
};

// EVERY FIELD A RUN OWNS, AS A RUN STARTS WITH IT. Taken here, once, before
// anything has touched it — so "what a new run looks like" is defined by the
// literal above and not by a hand-written list in another file that goes stale
// the first time a field is added here. `resetRun()` in js/save.js pours it
// back. (`mods` is deliberately not in it: mods.js has not loaded yet, and
// freshMods() is the only thing that should ever build that.)
const PLAYER_DEFAULTS = JSON.parse(JSON.stringify(player));

// melee outranges the Scrapper's reach (1.15) — spacing is the skill.
// The knife punches through metal: higher damage, stabbing attack.
// The rifle is not a faster pistol: it hits nearly twice as hard and its round
// travels further and flatter, and it pays for that in time between shots.
// TWO POCKETS OF AMMUNITION. They were one pool at first, on the theory that
// the ring only had one kind of round in it — but a service rifle firing hand-packed
// pistol rounds reads as a bug however it is justified, and it also gave the
// best gun in the game the most plentiful ammunition. So each gun names the
// pocket it feeds from, and the rifle's is the scarce one: the Correction
// issued those rounds, so the only places to get them are the machines that
// still carry them and the counter at Candlelight.
const GUNS = {
  pistol: { dmg: 10, cd: 0.5,  speed: 13, life: 0.5,  shake: 1.2, label: 'Scrap pistol',  cap: 6,  reload: 1.1 },
  rifle:  { dmg: 18, cd: 0.78, speed: 18, life: 0.75, shake: 2.2, label: 'Service rifle', cap: 12, reload: 1.6 },
};
// GUNS holds the rifle as it LEAVES BO'S BENCH. What it is once you have been
// back to that bench comes from gunStats() in js/mods.js, which folds in every
// part fitted to it — and which every reader here uses instead of GUNS.
const activeGun = () => gunStats(player.gun);

// ---------- RELOADING ----------
// A gun holds six or twelve, and then you have to stop and fill it. That pause
// is the whole mechanic: it is the moment where a machine walking at you costs
// you something. What it is NOT is bookkeeping — ammunition is loose rounds in
// a pocket, one number per gun, and reloading simply moves them into the
// weapon. Nothing is ever lost by reloading early, because there is nothing to
// lose: a part-full gun just takes fewer rounds to fill.
function magsOf(gun) { return player.arms[gun] || player.arms.pistol; }
const reserveOf = (gun) => magsOf(gun).reserve;
const capOf = (gun) => gunStats(gun).cap;

// rounds arriving from anywhere: a shop, a body, the ground. They go in the
// pocket, never straight into the gun — putting them in is what R is for.
function giveRounds(gun, n) {
  const rounds = Math.max(0, Math.floor(n === undefined ? capOf(gun) : n));
  magsOf(gun).reserve += rounds;
  return rounds;
}
// fill the gun on the spot, no pause — for the moment a weapon is handed over
function chamber(gun) {
  const A = magsOf(gun), take = Math.min(capOf(gun) - A.loaded, A.reserve);
  A.loaded += take; A.reserve -= take;
}
// everything you hold for this gun — used by the pack and by save migration
function roundsOf(gun) { const A = magsOf(gun); return A.loaded + A.reserve; }

function startReload() {
  if (!player.hasGun || player.reloadT > 0 || player.dead > 0) return;
  // a burst in the air finishes first — but the press is REMEMBERED, because
  // swallowing it would teach players that R does nothing in a firefight
  if (player.burst > 0) { player.reloadWanted = true; return; }
  const gun = player.gun, A = magsOf(gun);
  if (A.loaded >= capOf(gun)) { showMsg('ALREADY LOADED', 1.2); return; }
  if (A.reserve <= 0) { showMsg('NO ROUNDS LEFT', 1.4); SFX.dry(); return; }
  player.reloadT = gunStats(gun).reload;
  player.reloadOf = gun;
  SFX.reload ? SFX.reload() : SFX.switchW();
}

function finishReload() {
  const gun = player.reloadOf || player.gun;
  player.reloadOf = null;
  chamber(gun);
  SFX.buy();
  saveGame();
}

// ONE ROUND LEAVING THE GUN. Pulled out of the trigger block because the burst
// regulator fires the same round three times over a fifth of a second, and two
// copies of this would be two guns that drifted apart. `spread` is in radians
// off the aim line and is zero for everything except the second and third
// rounds of a burst — the first one always goes exactly where you pointed it.
function fireRound(G, spread) {
  const A = magsOf(player.gun);
  if (A.loaded <= 0) return false;
  A.loaded--;
  player.combatT = 0;
  player.muzzle = 0.06;
  const ang = player.angle + (spread ? (Math.random() * 2 - 1) * spread : 0);
  const dirW = screenToIso(Math.cos(ang), Math.sin(ang));
  const dl = Math.hypot(dirW.x, dirW.y) || 1;
  // the bullet carries its own damage — it used to be the number 10 written
  // into four separate hit sites, which made a second gun impossible
  bullets.push({
    x: player.x + (dirW.x / dl) * 0.35, y: player.y + (dirW.y / dl) * 0.35,
    vx: (dirW.x / dl) * G.speed, vy: (dirW.y / dl) * G.speed, life: G.life,
    dmg: G.dmg,
  });
  addShake(G.shake);
  SFX.shot();
  return true;
}

const MELEE = {
  pipe: { dmg: 7, cd: 0.55, range: 1.5, label: 'Metal pipe', stab: false },
  knife: { dmg: 18, cd: 0.4, range: 1.35, label: 'Piercing knife', stab: true },
};

// ---- staged tutorial: freezes the world briefly and explains one thing ----
const Tut = { active: null, done: {} };
// `onDo` runs when the taught key is finally pressed. The press that dismisses
// a lesson is swallowed by the freeze — so without this, being told "press R"
// and pressing R would teach you that pressing R does nothing.
function tutShow(id, lines, keys, footer, onDo) {
  if (Tut.done[id]) return;
  Tut.done[id] = true;
  Tut.active = { id, lines, keys, footer, onDo, grace: 0.3 };
  SFX.blip();
}

const bullets = [];

// items lying in the world (glowing pickups)
const items = [];
const itemKey = it => it.type + '@' + Number(it.x).toFixed(1) + ',' + Number(it.y).toFixed(1);
// identity of each area's starting items, so saves record what was taken
// without breaking when new items are added in an update
const START_ITEMS_BY_AREA = {};
for (const id of Object.keys(Areas)) {
  START_ITEMS_BY_AREA[id] = Areas[id].makeItems().map(itemKey);
}
function loadAreaItems(areaId) {
  items.length = 0;
  for (const it of Areas[areaId].makeItems()) items.push(it);
  // Items and geometry are two hand-written lists that nothing compares, so a
  // building moved by a later edit can seal a pickup inside itself — the
  // Fringe handed out 18 rounds of which 6 were never reachable. Same guard as
  // buildFolk: shout in the console so it gets fixed at the source, and in the
  // meantime put the pickup somewhere the player can actually stand.
  for (const it of items) {
    const tx = Math.floor(it.x), ty = Math.floor(it.y);
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H || !solid[ty][tx]) continue;
    console.warn('ITEM: ' + it.type + ' is sealed in geometry at ' + tx + ',' + ty);
    const spot = typeof findSafeSpot === 'function' ? findSafeSpot(it.x, it.y) : null;
    if (spot) { it.x = spot.x; it.y = spot.y; }
  }
}
loadAreaItems(currentArea);
// legacy alias used by the v1→v2 save migration
const START_ITEMS = START_ITEMS_BY_AREA.junkyard;

// pick an enemy spawn point tucked behind a trash mountain, away from the
// player - and, with two of them in the yard, away from each other too, so a
// pair never walks out from behind the same heap shoulder to shoulder
function pickSpawn(avoid) {
  let far = moundSpawns.filter(p => Math.hypot(p.x - player.x, p.y - player.y) > 9);
  if (avoid && avoid.length) {
    const clear = far.filter(p => avoid.every(a => Math.hypot(p.x - a.x, p.y - a.y) > 5));
    if (clear.length) far = clear;
  }
  const pool = far.length ? far : moundSpawns;
  if (pool.length) return pool[(Math.random() * pool.length) | 0];
  return { x: 24.5, y: 18.5 };
}

// The yard runs TWO Scrappers at once - the survivor says "more than one" and
// now he is telling the truth. Each one lives and respawns on its own timer,
// so the pair is only ever briefly down to one wreck and one hunter.
const SCRAPPER_COUNT = 2;
function makeScrapper() {
  return {
    x: 24.5, y: 18.5, r: 0.3,
    hp: 30, maxHp: 30,
    state: 'off', t: 0,        // 'off' until the survivor warns you about them
    tx: 24.5, ty: 18.5,
    animT: 0, frame: 0,
    hitFlash: 0, respawn: 0, didHit: false,
    kbx: 0, kby: 0,
    looted: false,
    detour: 0, detourX: 0, detourY: 0, // makeshift brain: sidestep obstacles
    alert: 0, idleT: 0,                // detection meter & patrol idle pause
    patrolFlip: false,                 // alternates heap ↔ central hub
    memory: 0, lastPX: 0, lastPY: 0,   // remembers a spotted player for 12s
    fx: 0, fy: 1, scan: 0,             // which way it is looking, and its sweep
  };
}
const scrappers = [];
for (let i = 0; i < SCRAPPER_COUNT; i++) scrappers.push(makeScrapper());

// Tallies that outlive any individual machine, so they belong to the squad.
// techPity counts wrecks looted since the last tech component: the drop is a
// 1-in-5 roll you can lose six times in a row, and a player who does gets one
// anyway. Only the yard's starter robots are this forgiving.
const TECH_CHANCE = 0.2;
const TECH_PITY = 6;
const ScrapperStats = { kills: 0, techPity: 0 };

function spawnScrapper(s) {
  const others = scrappers.filter(o => o !== s && o.state !== 'off' && o.state !== 'dead');
  const sp = pickSpawn(others);
  s.x = sp.x; s.y = sp.y;
  s.hp = s.maxHp;
  s.looted = false;
  s.detour = 0;
  s.alert = 0;
  s.idleT = 0;
  s.kbx = 0; s.kby = 0;
  s.hitFlash = 0;
  const p = patrolPoints[(Math.random() * patrolPoints.length) | 0] || { x: 16, y: 16 };
  s.tx = p.x; s.ty = p.y;
  s.state = 'patrol';
}
function spawnScrappers() { for (const s of scrappers) spawnScrapper(s); }
function scrappersOff() { for (const s of scrappers) s.state = 'off'; }

const npc = { x: 21.5, y: 6.5, animT: 0, frame: 0 };

// ---------- THE CAMP ----------
// This engine has had exactly one NPC in it since the beginning: Marek, above,
// named directly by the interaction code. A camp needs several in one room, so
// they are a LIST beside him rather than a rewrite of him — his mission, his
// trade and his dialogue are untouched, and nothing that already works had to
// be re-tested to get six more people standing in a church.
// Nobody here learns the player's name. Traveller, stranger, or nothing.
let folk = [];
const FOLK = {
  camp: [
    { key: 'vesna', name: 'VESNA', x: 7.5, y: 13.5, lines: [
      "Door stays shut after dark. That is the one rule that matters.",
      "You walked the sign road, so you can read. That already puts you ahead.",
      "Anything of ours you want, you ask. Nobody here minds being asked." ] },
    { key: 'osk', name: 'OSK', x: 3.5, y: 13.5, lines: [
      "That lot's the camp's. Not yours.",
      "Nothing personal, stranger. I'd say it to my own brother.",
      "Ask Halden. He's the one allowed to give things away." ] },
    { key: 'bo', name: 'BO', x: 3.5, y: 6.5, stock: 'bo', verb: 'REPAIRS', lines: [
      ["Bench is yours if you brought something that shoots.",
       "I can change what a gun does. Not what it is.",
       "That thing you're carrying, though. Let me see it."],
      "A rifle is parts, stranger. Change the parts, change the argument.",
      "Everything in that tray came off something that stopped working." ] },
    // ADE. Her counter is the medbay and it only has a row on it while there
    // is something to treat — the same shape as Bo's bench, which is empty
    // until you are carrying something bent. So her greeting is conditional
    // too: the line Laurens wrote is the one she says to somebody who is
    // whole, and it stays exactly as written for that.
    { key: 'ade', name: 'SISTER ADE', x: 9.5, y: 5.5, stock: 'ade', verb: 'MEDBAY',
      lines: () => (player.hp < player.maxHp ? [
        ["Sit down and let me see it.",
         "I have thread, I have spirit, and I have a lamp. Not much else.",
         "It costs you scrap. Not because of me — because of what it uses up."],
        "Hold still. This is the part everybody talks through.",
        "You keep coming back in pieces. One day you won't." ] : [
        "You're not bleeding. Come back when you are.",
        "The name stuck because of the building. I was a vet's assistant.",
        "Two cots. One of them has been the same man for eleven days." ]) },
    { key: 'halden', name: 'HALDEN', x: 9.5, y: 8.5, stock: 'halden', lines: [
      "Stand by the drum a while. Nobody gets asked anything until they're warm.",
      "This place was cold for a year before we got the stove in.",
      "I'll trade you fair. I'm too old to be clever about it." ] },
    { key: 'ivar', name: 'IVAR', x: 7.5, y: 2.5, lines: [
      "You came up the sign road. People only do that with nothing left.",
      "Read the table. Everything this camp knows about the ring is on it.",
      "We don't ask what you did before. Nobody here would like the answer." ] },
    // Tam keeps the camp's counter. He never asks where you came from — he
    // only knows what came up the road, which is that the way in is clear.
    { key: 'tam', name: 'TAM', x: 6.5, y: 6.5, stock: 'tam', lines: [
      ["Thank you for taking care of the bandits out there. The last three",
       "runners in said that road couldn't be walked.",
       "Anyway. I've got goods up for trade — are you interested?"],
      ["Back again. Nothing's moved. Have a look.",
       "Everything on the board is spoken for by somebody, so pay for it."],
      ["Take what you need and leave the scrap. That's the whole system.",
       "There's a room under the floor, too. I'm not allowed down. You might be."] ] },
  ],
  crypt: [],
  // THE PROLOGUE CAST. People and machines sharing a pavement, which is the
  // entire argument of the scene. They ride the folk pipeline — drawn, placed
  // and depth-sorted like the camp is — so the only new thing here is the list.
  //
  // `bot` marks a machine, and `key` is what it is DRAWN as. The Correction is
  // implemented by swapping every machine's key from ...Warm to ...Core on one
  // frame; nothing else about them changes, which is exactly how it should read.
  // Staged along the NORTH pavement and the near lane, so the frontage behind
  // them is a backdrop rather than something standing in front of them.
  prologue: [
    { key: 'botCarrierWarm', bot: true, name: 'CARRIER', x: 24.5, y: 12.5, glow: '255,176,46',
      lines: ["It waits to be let in. It has been waiting a while."] },
    { key: 'civRed', name: 'A WOMAN', x: 26.5, y: 12.5,
      lines: ["She steps around it without looking at it."] },
    { key: 'botSweeperWarm', bot: true, name: 'STREET UNIT', x: 19.5, y: 12.5, glow: '255,176,46',
      lines: ["Mending the kerb. Nobody has watched one of these in years."] },
    // On the road, crossing — NOT at (21.5, 13.5), which is the tile the
    // parked car sits on. He was standing on its roof.
    { key: 'civGreen', name: 'A MAN', x: 20.5, y: 14.5,
      lines: ["He is late for something that is still going to happen."] },
    { key: 'botMedicWarm', bot: true, name: 'MEDICAL UNIT', x: 15.5, y: 12.5, glow: '255,176,46',
      lines: ["Its hands are on somebody."] },
    { key: 'civGrey', name: 'A PATIENT', x: 14.5, y: 12.5,
      lines: ["Sitting still for it, the way you sit still for a doctor."] },
    // The child stands a lane out, so she is nearer the camera than the machine
    // she is looking at. It is the only staging in the scene that matters.
    { key: 'child', name: 'A CHILD', x: 14.5, y: 14.5,
      lines: ["Watching the machine with no fear in her at all."] },
    { key: 'civBlue', name: 'A MAN', x: 23.5, y: 14.5,
      lines: ["Carrying shopping in both hands."] },
  ],
};
function buildFolk(kind) {
  folk = (FOLK[kind] || []).map(f => Object.assign({ animT: 0, frame: 0, said: 0 }, f));
  // NOBODY STANDS ON A PROP. People are placed by hand in the list above and
  // props are placed by hand in map.js, and nothing was checking the two
  // against each other — which is how a man ended up standing on the roof of a
  // parked car in the prologue. Candlelight's builder has refused to stack two
  // things on one tile since it was written; this is the same rule for the one
  // kind of object that was exempt from it.
  for (const f of folk) {
    const tx = Math.floor(f.x), ty = Math.floor(f.y);
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H || !solid[ty][tx]) continue;
    console.warn('FOLK: ' + f.key + ' stands on a solid tile at ' + tx + ',' + ty);
    const spot = typeof findSafeSpot === 'function' ? findSafeSpot(f.x, f.y) : null;
    if (spot) { f.x = spot.x; f.y = spot.y; }
  }
}
// one line at a time, in order, then round again — so talking to somebody
// twice is worth doing and talking to them nine times is not. An entry may be
// several lines: a trader needs room to say what he is before he sells it.
// `lines` may be a function, for somebody whose opening line depends on the
// state of the person they are opening it to. Ade is the reason: "you're not
// bleeding, come back when you are" is exactly right when you are whole and
// exactly wrong when you have walked in at nine health.
function talkToFolk(f) {
  const list = typeof f.lines === 'function' ? f.lines() : f.lines;
  const said = list[f.said % list.length];
  const lines = Array.isArray(said) ? said.slice() : [said];
  lines[0] = f.name + ': ' + lines[0];
  startDialog(lines);
  f.said++;
  SFX.uiOpen();
  // the counter opens when he has finished saying it, not over the top of it —
  // and only if there is anything on it. Bo has nothing to offer a traveller
  // who is not carrying something bent.
  if (f.stock && STOCK[f.stock]) {
    const rows = resolveStock(STOCK[f.stock]);
    if (rows.length) Trade.pending = { who: f.name, stock: rows, verb: f.verb };
  }
}

// the map table, and the rest of the camp's fittings
let campMapRead = false;
function readMapTable() {
  if (campMapRead) {
    startDialog(["The ring, drawn by people who walked it. You have it all copied down."]);
    return;
  }
  campMapRead = true;
  // THE payoff of finding this place: somebody else's legwork, handed over.
  if (typeof exploredByArea !== 'undefined' && exploredByArea.fringe) exploredByArea.fringe.fill(1);
  SFX.tech();
  showMsg('THE RING, MAPPED  ·  M', 3.2);
  startDialog([
    "Streets, crossings, every way out, in three different hands.",
    "Somebody walked all of this so the next one would not have to.",
  ]);
}
// Fittings you can use. Each one answers twice: with `ask` it returns the
// prompt, without it, it does the thing.
const USABLE = {
  mapTable: (p, ask) => ask ? 'E — read the map' : readMapTable(),
  chest: (p, ask) => ask ? (p.open ? 'empty' : 'E — open') : openChest(p),
  strongbox: (p, ask) => ask ? 'locked' : startDialog([
    "Padlocked, and the key is not in this room.",
    "Whatever the camp keeps in there, it keeps from everyone." ]),
  cistern: (p, ask) => ask ? 'E — drink' : drinkFromCistern(),
  waterVat: (p, ask) => ask ? 'E — drink' : drinkFromCistern(),
  hayStack: (p, ask) => ask ? 'E — look' : startDialog([
    "Bales carried down a hatch one at a time, by somebody who is not young.",
    "Bedding, and feed for animals this camp does not have yet." ]),
  // Bo's bench is the one place in the ring where a gun can be changed. It only
  // opens for somebody carrying something worth changing — otherwise it is a
  // table with a stranger's work on it, and says so.
  workbench: (p, ask) => {
    const mine = player.owned.rifle;
    if (ask) return mine ? 'E — work the bench' : 'E — look';
    if (mine) { openGunsmith('rifle'); return; }
    startDialog([
      "A rifle in a cradle with its handguard off, a barrel in the vice,",
      "and a tray of springs and pins under a lamp somebody keeps lit.",
      "Nothing you are carrying belongs on a bench like this." ]);
  },
  // A BAY YOU CAN CLAIM. Taking one re-anchors where you wake up, which until
  // now was the junkyard shack no matter how far into the ring you had walked
  // — die at the roadblocks and you woke a whole area away, behind a boss.
  // Every bay is solid (everything placed in this room is), so the point you
  // wake at is the aisle beside it, and the aisle is checked rather than
  // assumed: only the middle bay actually has a free tile at its shoulder.
  bedding: (p, ask) => {
    const mine = player.respawnArea === 'candlelight' &&
                 Math.abs(player.respawnY - (p.gy + 0.5)) < 0.01;
    if (ask) return mine ? 'yours' : 'E — take this bay';
    if (mine) { startDialog(["Your bay. The straw still has your shape in it."]); return; }
    claimBay(p);
  },
  hearth: (p, ask) => ask ? 'E — look' : startDialog([
    "A drum with a fire in it and a flue punched through a boarded window.",
    "The first warm thing you have stood next to since the yard." ]),
};

// Claiming a bay: it re-anchors respawn AND it heals, because a bed that
// leaves you at nine health is a save point wearing a blanket. There is no
// clock in this game yet, so it moves no time on; if one ever arrives this is
// where it advances.
function claimBay(p) {
  let sx = p.gx + 1.5, sy = p.gy + 0.5;               // the aisle at its shoulder
  if (!canStand(sx, sy, player.r)) {
    const safe = findSafeSpot(p.gx + 1.5, p.gy + 0.5);
    if (safe) { sx = safe.x; sy = safe.y; }
  }
  player.respawnArea = 'candlelight';
  player.respawnX = sx; player.respawnY = sy;
  player.homeSet = true;
  player.hp = player.maxHp;
  SFX.chime();
  startDialog([
    "You clear the straw with your boot and sit down on it.",
    "Warm, out of the wind, and behind a door that shuts.",
    "This is where you wake up now." ]);
  saveGame();
}

function drinkFromCistern() {
  const before = player.hp;
  player.hp = Math.min(player.maxHp, player.hp + 12);
  SFX.eat();
  startDialog([player.hp > before
    ? "Cold, and it tastes of the roof. You have had worse."
    : "Cold, and it tastes of the roof."]);
}
function openChest(p) {
  if (p.open) { startDialog(["Empty. You already had this one."]); return; }
  p.open = true;
  SFX.loot();
  if (p.loot === 'crypt') {
    player.inv.tech += 2; player.inv.scrap += 3;
    showMsg('+2 tech  ·  +3 scrap');
  } else if (p.loot === 'scrap') {
    player.inv.scrap += 4;
    showMsg('+4 scrap');
  } else if (p.loot === 'mre') {
    player.inv.mreBeef++;
    showMsg('+1 beef MRE  (H to eat)');
  } else {
    player.inv.scrap += 2;
    if (player.inv.snack !== undefined) player.inv.snack++;
    showMsg('+2 scrap  ·  +1 snack bar');
  }
  // A CHEST CAN HOLD A WEAPON PART, and one of them does. It is announced
  // LAST, over the top of the scrap line, because a drum magazine is not "+2
  // tech" — it is the reason you came down here, even if you did not know that
  // yet — and the last message printed is the one left on the screen.
  if (p.part && givePart(p.part)) {
    showMsg(PARTS[p.part].name.toUpperCase() + '  ·  fit it at Bo\'s bench', 3.4);
    think('gunpart', 'They had no use for it. Nobody down here owns a rifle.');
    SFX.tech();
  }
}

const Dialog = { active: false, lines: [], idx: 0 };
function startDialog(lines) { Dialog.active = true; Dialog.lines = lines; Dialog.idx = 0; }

// The counter. It used to be one panel with Marek's three items written into
// the drawing code, which meant a second trader could not exist. Now the panel
// is empty furniture and whoever opened it supplies the stock.
const Trade = { open: false, who: 'SURVIVOR', stock: [], pending: null, verb: 'TRADE' };
const InvUI = { open: false };

const mission = { state: 'none' };   // none -> active -> complete -> turned

// ---------- WHAT NOW, AND WHERE ----------
// There is no quest system to hang a marker on, and building one to draw a dot
// would be the tail wagging the dog. So this is the smallest honest thing: one
// function that reads live state and answers both halves of the question.
//
// It matters that it is ONE function. Before this, the HUD carried its own
// hard-coded objective string, and the "quest marker" was the NPC blip on the
// minimap — which meant "the quest is there" only by accident, and stopped
// meaning it the moment a second NPC existed. (It does now: seven of them, in
// the church.) The HUD line, the minimap dot and the map dot all read this.
//
// Coordinates are given in their OWN area and are hard-coded rather than read
// off live globals like patrolCenter, because the question has to be
// answerable from anywhere — you should be able to open the map in the church
// and see where the yard wants you.
// THE CHAIN, IN ORDER. It used to be a ladder of ifs that could only ever
// answer "what now" — which was enough while the only consumer was one dot.
// The map shows the log now, so the same six steps have to be addressable
// backwards as well: which are behind you, and what each one was. A table plus
// a rank does both and cannot contradict itself, because "done" is not stored
// anywhere — it is `rank > mine`, and the rank only ever climbs.
//
// `detail` is the forward-looking line: what you are about to do, in the
// traveller's voice. `log` is the same step in the past tense, for the ledger.
const OBJECTIVES = [
  { id: 'marek', title: () => 'Talk to the survivor',
    area: 'junkyard', x: 21.5, y: 7.5,
    detail: 'There is a light on in the shack, and a man in it who has not shot at me yet.',
    log: 'Found the lit shack, and Marek in it.' },
  // The counter belongs to the step while you are ON it. In the ledger it read
  // "loot scrap 0/5" beside a tick, because the scrap it was counting had long
  // since been handed over — a finished step must not report live state.
  { id: 'scrap', title: (done) => done ? 'Destroy Scrappers'
        : `Destroy Scrappers — loot scrap ${Math.min(player.inv.scrap, 5)}/5`,
    area: 'junkyard', x: 21.5, y: 12.5,
    detail: 'The old man fed me. He will want something for the pipe. They patrol the middle of the yard.',
    log: 'Broke the yard machines for five scrap.' },
  { id: 'return', title: () => 'Return to the survivor',
    area: 'junkyard', x: 21.5, y: 7.5,
    detail: 'Five scrap, and the machines that were carrying it are not any more.',
    log: 'Paid Marek. He gave me a pistol and his gate key.' },
  { id: 'gate', title: () => 'Unlock the yard gate',
    area: 'junkyard', x: 30.5, y: 12.5,
    detail: 'Marek gave me the key to it. East through that gate is the ring road out of the yard.',
    log: 'Unlocked the gate and went east.' },
  // THE AMBUSH IS NEVER MARKED — a dot pointing at it gives the whole thing
  // away — so this step is silent while you are on it. It still belongs in the
  // table: once it is behind you it is the biggest thing that happened, and the
  // log would be lying by omission without it.
  { id: 'compactor', title: () => 'Survive the yard', silent: true,
    area: 'junkyard', x: 30.5, y: 12.5,
    detail: '',
    log: 'Something enormous was waiting at the gate. Not any more.' },
  { id: 'shelter', title: () => 'Reach the shelter',
    area: 'fringe', x: 56, y: 68,
    detail: 'Somebody painted the signs after. Follow them west and there is a church people live in.',
    log: "Followed the signs west to St Martin's." },
];

// `gateProp` only exists while the junkyard is the area that is built, and the
// gate is the only way out of the yard — so from anywhere else it is open by
// definition, and the chain must not fall back a step because you walked away.
const yardGateOpen = () => currentArea !== 'junkyard' || !!(gateProp && gateProp.open);

// How far along the chain the run is: the index of the step you are ON.
// Read top-down so the furthest evidence always wins — a save that arrives with
// the boss dead can never report the errand it skipped as still outstanding.
function questRank() {
  if (campMapRead)                  return 6;   // past the end: the chain is quiet
  if (bossDefeated)                 return 5;
  if (yardGateOpen())               return 4;
  if (mission.state === 'turned')   return 3;
  if (mission.state === 'complete') return 2;
  if (mission.state === 'active')   return 1;
  return 0;
}

function currentObjective() {
  const o = OBJECTIVES[questRank()];
  if (!o || o.silent) return null;
  return { id: o.id, title: o.title(false), area: o.area, x: o.x, y: o.y, detail: o.detail };
}

// The ledger: every step the run has reached, oldest first. A silent step shows
// up only once it is behind you — while you are on it, it is a surprise.
function objectiveLog() {
  const r = questRank();
  const out = [];
  for (let i = 0; i < OBJECTIVES.length; i++) {
    if (i > r) break;
    const o = OBJECTIVES[i], done = i < r;
    if (o.silent && !done) continue;
    out.push({ id: o.id, done, title: o.title(done), text: done ? o.log : o.detail });
  }
  return out;
}

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
      // a boss fight resets itself — you retry it, you don't redo the run
      if (typeof resetBossFight === 'function' && resetBossFight()) return;
      player.hp = player.maxHp; player.iframes = 1.2;
      // Waking up somewhere else is an area change like any other, so it goes
      // through the same fade that walking through a door does — otherwise the
      // world would cut, and a cut here reads as a crash.
      if (player.respawnArea && player.respawnArea !== currentArea) {
        startTransition(player.respawnArea, { x: player.respawnX, y: player.respawnY });
      } else {
        player.x = player.respawnX; player.y = player.respawnY;
      }
    }
    return;
  }

  // stepping into the shack claims it as your respawn point
  if (!player.homeSet && insideShack(player.x, player.y)) {
    player.homeSet = true;
    player.respawnX = 21.5; player.respawnY = 7.5;
    player.respawnArea = 'junkyard';
    showMsg('Respawn point set — the shack', 2.5);
    SFX.chime();
    saveGame();
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

  // crouch: slower, but much harder for machines to spot at range
  player.crouch = !!(Input.keys['ShiftLeft'] || Input.keys['ShiftRight'] || Input.keys['KeyC']);

  player.iframes -= dt; player.flash -= dt;
  if (player.scrollHintT > 0) player.scrollHintT -= dt;

  // passive healing: 20s without combat, then slow regen
  player.combatT += dt;
  if (player.combatT > 20 && player.hp < player.maxHp) {
    player.hp = Math.min(player.maxHp, player.hp + 3 * dt);
  }

  if (player.moving) {
    const spd = player.crouch ? 2.1 : SPEED;
    tryMove(player, wx * spd * dt, wy * spd * dt);
    player.animT += dt;
    if (player.animT > (player.crouch ? 0.22 : 0.14)) {
      player.animT = 0;
      player.frame = 1 - player.frame;
      if (player.frame === 0) SFX.step(player.crouch);   // one step per stride
    }
  } else {
    player.frame = 0;
  }

  const ps = isoToScreen(player.x, player.y);
  const ms = isoToScreen(Input.worldX, Input.worldY);
  player.angle = Math.atan2(ms.y - ps.y, ms.x - ps.x);

  // ---- one active weapon, LMB uses it, mouse wheel switches ----
  if (player.active === 'gun' && !player.hasGun) player.active = 'melee';
  if (player.active === 'melee' && !player.melee && player.hasGun) player.active = 'gun';

  player.fireCd -= dt; player.muzzle -= dt;
  player.swing -= dt; player.swingCd -= dt;
  if (player.burstCd > 0) player.burstCd -= dt;

  // ---- reloading. The pause IS the mechanic, so it blocks the trigger.
  if (player.reloadT > 0) {
    player.reloadT -= dt;
    if (player.reloadT <= 0) finishReload();
  }
  if (Input.pressed['KeyR']) { Input.pressed['KeyR'] = false; startReload(); }

  // ---- A BURST ALREADY IN THE AIR FINISHES ITSELF. Letting go of the trigger
  // does not call the second and third rounds back, and that is the burst
  // regulator's entire cost: you stop choosing how many rounds to spend.
  if (player.burst > 0) {
    player.burstT -= dt;
    const G = activeGun();
    while (player.burst > 0 && player.burstT <= 0) {
      if (player.dead > 0 || player.reloadT > 0 || !fireRound(G, G.spread)) {
        player.burst = 0;                     // dead, reloading, or simply empty
        break;
      }
      player.burst--;
      player.burstT += G.burstGap || 0.08;
    }
    if (player.burst <= 0 && player.reloadWanted) {
      player.reloadWanted = false;
      startReload();
    }
  }

  // ---- THE TRIGGER. Left is always one round. The burst regulator does not
  // take that away from you — it puts a second trigger under your right finger,
  // and you decide, shot by shot, which one this moment is worth. Holding
  // either repeats it; the burst still finishes whatever it started.
  const G0 = activeGun();
  // the burst RECHARGES — it is an ability, not a fire mode, so holding the
  // right button cannot spray with it and the slot draws the wait
  const wantBurst = Input.rDown && G0.burst > 1 && player.burstCd <= 0;
  if ((Input.mouseDown || wantBurst) && player.fireCd <= 0 && player.hasGun &&
      player.burst <= 0 && player.active === 'gun' && player.reloadT <= 0) {
    const G = G0;
    const A = player.arms[player.gun];
    if (A.loaded > 0) {
      player.fireCd = G.cd;
      fireRound(G, 0);                        // the first round always goes true
      if (wantBurst) {
        player.burst = G.burst - 1;
        player.burstT = G.burstGap || 0.08;
        player.burstCd = G.burstCool || 2;
      }
    } else {
      // an empty chamber is a moment, not an error message. The lesson fires
      // once, the first time it ever happens.
      player.fireCd = 0.35;
      SFX.dry();
      if (A.reserve > 0) {
        tutShow('reload',
          ['The gun is empty.', 'Press R to reload it —',
           'it takes a moment, so pick your moment.'],
          ['KeyR'], 'PRESS R', startReload);
        showMsg('EMPTY — press R to reload', 1.4);
      } else {
        showMsg('NO ROUNDS LEFT — scroll to your melee', 1.8);
      }
    }
  }

  const wantSwing = Input.pressed['LMB'] && player.active === 'melee';
  if (wantSwing && player.swingCd <= 0 && player.melee) {
    const m = MELEE[player.melee];
    player.swing = 0.22; player.swingCd = m.cd;
    player.combatT = 0;
    addShake(1);
    if (m.stab) SFX.stab(); else SFX.swing();
    // melee vs the boss: impact point along the aim line at the hull edge
    if (typeof boss !== 'undefined' && boss.active &&
        boss.state !== 'hidden' && boss.state !== 'dead') {
      const bd = Math.hypot(boss.x - player.x, boss.y - player.y);
      if (bd < m.range + boss.r) {
        const dirW = screenToIso(Math.cos(player.angle), Math.sin(player.angle));
        const dl = Math.hypot(dirW.x, dirW.y) || 1;
        const reach = Math.min(bd, m.range + boss.r * 0.5);
        const hx = player.x + (dirW.x / dl) * reach;
        const hy = player.y + (dirW.y / dl) * reach;
        if (Math.hypot(hx - boss.x, hy - boss.y) < boss.r + 0.3) {
          bossHit(hx, hy, m.dmg, m.stab ? 'knife' : 'pipe');
        }
      }
    }
    // one swing, every machine standing in the arc - fighting two at once is
    // the point of the pair, so the pipe has to be able to catch both
    for (const sc of scrappers) {
      if (sc.state === 'dead' || sc.state === 'off') continue;
      const dx = sc.x - player.x, dy = sc.y - player.y;
      const d = Math.hypot(dx, dy);
      if (d >= m.range) continue;
      const ss = isoToScreen(sc.x, sc.y);
      const a = Math.atan2(ss.y - ps.y, ss.x - ps.x);
      let diff = Math.abs(a - player.angle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff >= 1.3) continue;
      sc.hp -= m.dmg;
      sc.hitFlash = 0.08;
      sc.kbx += (dx / (d || 1)) * 0.10;
      sc.kby += (dy / (d || 1)) * 0.10;
      spawnSparks(sc.x, sc.y, 6, ['#ffd27a', '#c9c9d2']);
      addShake(2);
      SFX.clang();
      if (sc.hp <= 0) killScrapper(sc);
    }
    // the same swing, every raider standing in the arc. A knife punches
    // through a machine's plate; against a person it simply cuts, so the
    // stab bonus is the same number but it staggers them far less.
    for (const bd of bandits) {
      if (bd.dead) continue;
      const dx = bd.x - player.x, dy = bd.y - player.y;
      const d = Math.hypot(dx, dy);
      if (d >= m.range) continue;
      const bs = isoToScreen(bd.x, bd.y);
      const a = Math.atan2(bs.y - ps.y, bs.x - ps.x);
      let diff = Math.abs(a - player.angle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff >= 1.3) continue;
      banditHit(bd, m.dmg, dx / (d || 1), dy / (d || 1), m.stab);
      addShake(2);
    }
    // and the droids standing in it — one swing, every foe in the arc
    if (typeof droidMeleeHit === 'function') droidMeleeHit(m, ps);
  }

  // ---- eat something ----
  if (Input.pressed['KeyH']) {
    Input.pressed['KeyH'] = false;
    eatSomething();
  }
}

// H eats the WORST thing you are carrying that still helps, so the good ration
// is still in the pack when it matters. Cheapest first, never the last resort.
const FOOD = [
  { id: 'snack', heal: 40, label: 'a snack bar' },
  { id: 'mreChicken', heal: 45, label: 'a chicken MRE' },
  { id: 'mreBeef', heal: 60, label: 'a beef MRE' },
];
function eatSomething() {
  const have = FOOD.filter(f => player.inv[f.id] > 0);
  if (!have.length) { showMsg('Nothing to eat — the camp trades rations', 1.8); return; }
  if (player.hp >= player.maxHp) { showMsg('Already at full health', 1.5); SFX.deny(); return; }
  const f = have[0];
  eatFood(f);
}
function eatFood(f) {
  player.inv[f.id]--;
  player.hp = Math.min(player.maxHp, player.hp + f.heal);
  showMsg('Ate ' + f.label + '  (+' + f.heal + ' HP)');
  SFX.eat();
}

// ---- interactions: items, NPC, lootable wrecks ----
function updateItems(dt) {
  Prompt = null;
  if (player.dead > 0) return;

  // Each kind of thing has its own reach, and the CLOSEST RELATIVE TO ITS OWN
  // REACH wins. It used to be one shared `bestD` seeded at 1.1, which quietly
  // clamped every larger reach back down to 1.1 — the map table, two tiles
  // wide and measured to its anchor CORNER, could not be stood close enough to
  // at all. Distances are to the nearest tile of a prop's footprint now, and
  // to tile centres, not corners.
  let best = null, bestScore = Infinity, bestKind = null;
  const consider = (obj, kind, d, reach) => {
    if (d >= reach) return;
    const score = d / reach;
    if (score < bestScore) { bestScore = score; best = obj; bestKind = kind; }
  };
  // how far the player is from the nearest tile a prop actually stands on
  const propDist = (p) => {
    const f = p.foot || [p.gx, p.gy, 1, 1];
    const tx = Math.max(f[0], Math.min(Math.floor(player.x), f[0] + f[2] - 1));
    const ty = Math.max(f[1], Math.min(Math.floor(player.y), f[1] + f[3] - 1));
    return Math.hypot(player.x - (tx + 0.5), player.y - (ty + 0.5));
  };
  for (const it of items) consider(it, 'item', Math.hypot(player.x - it.x, player.y - it.y), 1.1);
  if (currentAreaDef().hasNpc)
    consider(npc, 'npc', Math.hypot(player.x - npc.x, player.y - npc.y), 1.3);
  for (const f of folk)
    consider(f, 'folk', Math.hypot(player.x - f.x, player.y - f.y), 1.4);
  // the camp's fittings you can actually use
  if (currentAreaDef().indoors) {
    for (const p of props) {
      if (!USABLE[p.type]) continue;
      consider(p, 'fitting', propDist(p), 1.4);
    }
  }
  // the yard gate (main game only, never during the fight or cutscene)
  if (!window.ARENA_MODE && currentArea === 'junkyard' && !GateCine.active &&
      !(boss.active && boss.state !== 'dead' && !bossDefeated)) {
    consider('gate', 'gate', Math.hypot(player.x - 30.3, player.y - 12.5), 1.7);
  }
  for (const sc of scrappers) {
    if (sc.state !== 'dead' || sc.looted) continue;
    consider(sc, 'wreck', Math.hypot(player.x - sc.x, player.y - sc.y), 1.1);
  }
  for (const bd of bandits) {
    if (!bd.dead || bd.looted || bd.deadT >= CORPSE_LINGER) continue;
    consider(bd, 'body', Math.hypot(player.x - bd.x, player.y - bd.y), 1.1);
  }
  if (typeof droids !== 'undefined') {
    for (const dr of droids) {
      if (dr.state !== 'dead' || dr.looted || dr.deadT >= CORPSE_LINGER) continue;
      consider(dr, 'droid', Math.hypot(player.x - dr.x, player.y - dr.y), 1.2);
    }
  }
  if (typeof droids !== 'undefined') {
    for (const dr of droids) {
      if (dr.state !== 'dead' || dr.looted) continue;
      consider(dr, 'droidWreck', Math.hypot(player.x - dr.x, player.y - dr.y), 1.1);
    }
  }

  if (bestKind === 'gate') {
    const gs = isoToScreen(30.6, 12.5);
    if (bossDefeated) {
      Prompt = { sx: gs.x, sy: gs.y - 34, text: 'walk through →' };
      if (Input.pressed['KeyE']) {
        Input.pressed['KeyE'] = false;
        think('leave', 'The road out. Nothing stopping me now.');
      }
    } else if (player.inv.gateKey) {
      Prompt = { sx: gs.x, sy: gs.y - 34, text: 'E — unlock the gate' };
      if (Input.pressed['KeyE']) {
        Input.pressed['KeyE'] = false;
        startGateCine();
      }
    } else {
      Prompt = { sx: gs.x, sy: gs.y - 34, text: 'locked' };
      if (Input.pressed['KeyE']) {
        Input.pressed['KeyE'] = false;
        think('gatelocked', 'Locked tight. Marek must have the key.');
      }
    }
  } else if (bestKind === 'npc') {
    const s = isoToScreen(npc.x, npc.y);
    Prompt = { sx: s.x, sy: s.y - 30, text: mission.state === 'turned' ? 'E — trade' : 'E — talk' };
    if (Input.pressed['KeyE']) { Input.pressed['KeyE'] = false; talkToNpc(); }
  } else if (bestKind === 'folk') {
    const s = isoToScreen(best.x, best.y);
    Prompt = { sx: s.x, sy: s.y - 30, text: 'E — talk' };
    if (Input.pressed['KeyE']) { Input.pressed['KeyE'] = false; talkToFolk(best); }
  } else if (bestKind === 'fitting') {
    const s = isoToScreen(best.gx, best.gy);
    Prompt = { sx: s.x, sy: s.y - 26, text: USABLE[best.type](best, true) };
    if (Input.pressed['KeyE']) { Input.pressed['KeyE'] = false; USABLE[best.type](best, false); }
  } else if (bestKind === 'wreck') {
    const wreck = best;
    const s = isoToScreen(wreck.x, wreck.y);
    Prompt = { sx: s.x, sy: s.y - 20, text: 'E — loot wreck' };
    if (Input.pressed['KeyE']) {
      Input.pressed['KeyE'] = false;
      const r = Math.random();
      const n = r < 0.5 ? 1 : r < 0.85 ? 2 : 3;   // small chance of a rich wreck
      player.inv.scrap += n;
      // bad luck has a floor: after five dry wrecks the sixth always pays out
      const gotTech = Math.random() < TECH_CHANCE || ScrapperStats.techPity >= TECH_PITY - 1;
      let extra = '';
      if (gotTech) {
        player.inv.tech++;
        ScrapperStats.techPity = 0;
        extra = '  · +1 LOW-QUALITY tech component';
      } else {
        ScrapperStats.techPity++;
      }
      showMsg(`Looted ${n} scrap${extra}`);
      spawnSparks(wreck.x, wreck.y, 5, ['#8a8a92', '#ffd27a']);
      if (extra) SFX.tech(); else SFX.loot();
      wreck.looted = true;
      wreck.respawn = Math.min(wreck.respawn, 4);
      saveGame();
      tutShow('loot',
        ['Dead machines can be looted for scrap', 'and rare tech components.', 'Press I to open your pack.'],
        ['KeyI', 'Tab'], 'PRESS I');
    }
  } else if (bestKind === 'droidWreck') {
    // HHDs carry better parts than yard machines — but NO rifle. The ring's
    // weapon upgrade comes off the Compactor damaged and is repaired at the
    // camp, so a droid is never the way you get your gun (Laurens, 2026-08-19).
    const dr = best;
    const ds = isoToScreen(dr.x, dr.y);
    Prompt = { sx: ds.x, sy: ds.y - 20, text: 'E — strip the droid' };
    if (Input.pressed['KeyE']) {
      Input.pressed['KeyE'] = false;
      dr.looted = true;
      const n = 2 + ((Math.random() * 2) | 0);
      player.inv.scrap += n;
      let extra = '';
      if (Math.random() < 0.45) { player.inv.tech++; extra = '  · +1 tech component'; SFX.tech(); }
      else SFX.loot();
      showMsg(`Stripped the droid — ${n} scrap${extra}`);
      spawnSparks(dr.x, dr.y, 5, ['#6fd3ff', '#c9c9d2']);
      saveGame();
    }
  } else if (bestKind === 'droid') {
    const dr = best;
    const ds = isoToScreen(dr.x, dr.y);
    Prompt = { sx: ds.x, sy: ds.y - 22, text: 'E — strip the hull' };
    if (Input.pressed['KeyE']) {
      Input.pressed['KeyE'] = false;
      // factory plate is worth more than yard junk, and the ones built around
      // a rifle are carrying the only rounds in the ring that fit one
      const n = 2 + ((Math.random() * 3) | 0);
      player.inv.scrap += n;
      let extra = '';
      const carriedRifle = DROID_TYPES[dr.type] && DROID_TYPES[dr.type].weapon === 'rifle';
      if (carriedRifle) {
        // it was part-way through its own load when you put it down
        const n = giveRounds('rifle', 4 + ((Math.random() * 8) | 0));
        extra += '  · +' + n + ' RIFLE rounds';
      }
      // THE PART OFF THE MACHINE. The two factory fittings nobody in this ring
      // can make are carried by the machines that use them: a Marshal fires in
      // threes and the thing making it do that unbolts, and a Magistrate's
      // cannon is a long heavy barrel that will thread onto a service rifle.
      // You only take it if you know what it is — which means owning the gun,
      // or carrying the bent one you are on your way to have straightened.
      const partId = DROID_PARTS[dr.type];
      if (partId && (player.owned.rifle || (player.inv.rifleBroken || 0) > 0) &&
          givePart(partId)) {
        extra += '  · ' + PARTS[partId].name.toUpperCase();
        think('gunpart', 'This comes off. Bo has a bench for exactly this.');
      }
      if (Math.random() < 0.35) { player.inv.tech++; extra += '  · +1 tech component'; }
      showMsg('Stripped ' + n + ' scrap' + extra, 2.6);
      spawnSparks(dr.x, dr.y, 6, ['#c9c9d2', '#ffd27a']);
      SFX.tech();
      dr.looted = true;
      saveGame();
    }
  } else if (bestKind === 'body') {
    const bd = best;
    const bs = isoToScreen(bd.x, bd.y);
    Prompt = { sx: bs.x, sy: bs.y - 18, text: 'E — search body' };
    if (Input.pressed['KeyE']) {
      Input.pressed['KeyE'] = false;
      // they carried what they took off everyone else who came this way
      const n = 1 + ((Math.random() * 3) | 0);
      player.inv.scrap += n;
      let extra = '';
      if (bd.role !== 'knife') {                 // the shooters carried rounds
        const rounds = giveRounds('pistol', 2 + ((Math.random() * 5) | 0));
        extra += `  · +${rounds} rounds`;
      }
      if (Math.random() < 0.3) { player.inv.snack++; extra += '  · +1 snack bar'; }
      showMsg(`Searched the body — ${n} scrap${extra}`);
      spawnSparks(bd.x, bd.y, 4, ['#a8342c', '#b89a54']);
      SFX.loot();
      bd.looted = true;
      saveGame();
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
        const gun = best.gun || 'pistol';
        const n = giveRounds(gun, best.amount);
        showMsg(`+${n}` + (gun === 'rifle' ? ' RIFLE rounds' : ' rounds'));
      }
      spawnSparks(best.x, best.y, 8, ['#ffd27a', '#fff2c0']);
      SFX.pickup();
      items.splice(items.indexOf(best), 1);
      saveGame();
    }
  }
}

function talkToNpc() {
  if (mission.state === 'none') {
    startDialog([
      "You're awake, traveller. Found you half-dead by the fence.",
      "Scrappers prowl this yard. More than one.",
      player.melee ? "That pipe will do. Crude, but it swings."
                   : "There's a steel pipe out in the junk. Arm yourself.",
      "Break the machines. Loot 5 scrap off the wrecks.",
    ]);
    mission.state = 'active';
    spawnScrappers();            // his warning is what wakes the yard up
    saveGame();
  } else if (mission.state === 'active') {
    startDialog(["Smash the Scrappers. Bring me 5 scrap."]);
  } else if (mission.state === 'complete') {
    startDialog([
      "Ha. Not bad for a corpse.",
      "Take this — my old sidearm. Loaded, and six more in your hand.",
      "It holds six. When it clicks, press R and fill it again.",
      "And these — keys to the yard gate.",
      "When you're ready, the city waits beyond it.",
      "Bring me scrap meanwhile — I trade. Food, rounds, steel.",
    ]);
    mission.state = 'turned';
    player.owned.pistol = true;
    player.hasGun = true;
    player.active = 'gun';
    player.scrollHintT = 30;
    giveRounds('pistol', 12);
    chamber('pistol');           // six in the gun, six in the pocket
    player.inv.gateKey = true;
    showMsg('SCRAP PISTOL + 12 ROUNDS + GATE KEY', 3.5);
    saveGame();
    tutShow('gun',
      ['Scroll the MOUSE WHEEL to switch', 'between pistol and melee.', 'LMB uses the selected weapon.'],
      'any', 'PRESS ANY KEY');
  } else if (!Tut.done.marekRoads) {
    // once you're armed, he tells you what's out there — the sign trail
    Tut.done.marekRoads = true;
    startDialog([
      "Beyond that gate is the old ring road. Follow it west.",
      "Signs still stand. Somebody painted them after. They'll",
      "take you to St Martin's — a church. People live in it now.",
      "They call it Candlelight.",
      "Listen to me. The Scrappers in here are junk-eaters.",
      "In the city there are others. Tall. Armed. Built to hunt",
      "people, and nothing else. We call them Hunter-Droids.",
      "They don't rummage, traveller. They look for you.",
      "If you see one first, that's your only advantage. Use it.",
      "Read the signs. This city still says where it goes.",
    ]);
  } else {
    openTrade('SURVIVOR', STOCK.marek);
  }
}

// ---------- what the traders keep on the board ----------
// A row is: what it is called, what it costs, whether it is gone, and what
// happens when you buy it. Nothing about it is drawn here — the panel reads
// this list, so a new trader is a new list and no UI work at all.
// A RIFLE PART ON A COUNTER. The price lives on the part (js/mods.js), so it
// is written once wherever it is sold; the row disappears once you own one,
// because a part is a thing and you cannot want a second. It never appears at
// all until you are carrying the rifle — a stock list should not advertise
// fittings for a gun the traveller has never held.
const partRow = (id) => ({
  label: PARTS[id].name.toLowerCase(),
  icon: () => Sprites.partIcon(id),
  cost: PARTS[id].cost,
  sold: () => ownsPart(id),
  buy: () => {
    givePart(id);
    showMsg(PARTS[id].name.toUpperCase() + ' — fit it at the bench', 2.6);
  },
});
const partRows = (...ids) => (player.owned.rifle ? ids.map(partRow) : []);

const STOCK = {
  marek: [
    { label: 'snack bar', icon: () => Sprites.snackIcon, cost: { scrap: 4 },
      buy: () => { player.inv.snack++; showMsg('Bought a snack bar  (H to eat)'); } },
    { label: '6 rounds', icon: () => Sprites.ammo, cost: { scrap: 6 },
      buy: () => { giveRounds('pistol', 6); showMsg('Bought 6 pistol rounds'); } },
    { label: 'piercing knife', icon: () => Sprites.knifeIcon, cost: { tech: 2 },
      sold: () => player.owned.knife,
      buy: () => {
        player.owned.knife = true; player.melee = 'knife';
        showMsg('PIERCING KNIFE acquired');
      } },
  ],
  // BO. He is the camp's gunsmith, so his counter is the one job nobody else
  // in the ring can do — and, once you have a rifle, the two fittings a man
  // with a vice and a sewing awl can actually make himself. What he cannot
  // make is anything that came out of a factory: no drum, no diode, no
  // regulator. Those come off machines, or off Tam, who buys from people who
  // go further out than he does.
  bo: () => [
    ...(((player.inv.rifleBroken || 0) > 0 && !player.owned.rifle) ? [
      { label: 'straighten it', icon: () => Sprites.rifleIcon,
        cost: { tech: 3, scrap: 10 },
        buy: () => {
          player.inv.rifleBroken--;
          player.owned.rifle = true;
          player.gun = 'rifle';
          player.hasGun = true;
          player.active = 'gun';
          chamber('rifle');      // he hands it back loaded, if you have rounds
          showMsg('SERVICE RIFLE — straightened, and it works');
        } },
    ] : []),
    ...partRows('stkPadded', 'magLight'),
  ],
  // HALDEN keeps the camp's dry stores, and the gap he fills is a real one:
  // Tam sells RIFLE rounds and nobody in this camp sold pistol rounds at all,
  // so a traveller who has not paid Bo to straighten the rifle yet could walk
  // into the only camp in the ring and find nothing that fits his gun. He is
  // also cheaper than Marek on both rows, which is what "I'll trade you fair,
  // I'm too old to be clever about it" is supposed to mean.
  halden: [
    { label: '6 pistol rounds', icon: () => Sprites.ammo, cost: { scrap: 5 },
      buy: () => { giveRounds('pistol', 6); showMsg('Bought 6 pistol rounds'); } },
    { label: 'snack bar', icon: () => Sprites.snackIcon, cost: { scrap: 3 },
      buy: () => { player.inv.snack++; showMsg('Bought a snack bar  (H to eat)'); } },
  ],
  // ADE'S MEDBAY. The first repeatable scrap sink in the game — everything
  // else the ring sells is a thing you buy once. The price is what you are
  // asking her to spend, so it scales with the damage rather than sitting at
  // a flat rate that robs you for a scratch and gives away a near-death.
  // Resolved once when the counter opens, so the number cannot move under the
  // cursor while you decide.
  ade: () => {
    const missing = player.maxHp - player.hp;
    if (missing <= 0) return [];
    return [
      { label: 'patch you up', icon: () => Sprites.medIcon,
        cost: { scrap: Math.max(2, Math.round(missing / 10)) },
        sold: () => player.hp >= player.maxHp,
        soldText: 'Nothing left to treat',
        buy: () => {
          player.hp = player.maxHp;
          SFX.eat();
          showMsg('Patched up — back on your feet', 2.2);
        } },
    ];
  },
  // Tam's counter. Rations and rounds, and one tech part at a price that says
  // he knows exactly what it is worth to somebody carrying a scrap pistol. No
  // weapon parts: what this camp has of those is in its chests, not on its
  // counter.
  tam: [
    { label: '12 rifle rounds', icon: () => Sprites.ammoRifle, cost: { scrap: 7 },
      buy: () => { giveRounds('rifle', 12); showMsg('Bought 12 rifle rounds'); } },
    { label: 'beef MRE', icon: () => Sprites.mreBeef, cost: { scrap: 6 },
      buy: () => { player.inv.mreBeef++; showMsg('Bought a beef MRE  (H to eat)'); } },
    { label: 'chicken MRE', icon: () => Sprites.mreChicken, cost: { scrap: 4 },
      buy: () => { player.inv.mreChicken++; showMsg('Bought a chicken MRE  (H to eat)'); } },
    { label: 'low-q tech part', icon: () => Sprites.techIcon, cost: { scrap: 9 },
      buy: () => { player.inv.tech++; showMsg('Bought a low-quality tech component'); } },
  ],
};
// short, because these sit in a price at the right-hand edge of a panel —
// the pack is where an item gets its full name
const COST_NAME = { scrap: 'scrap', tech: 'tech' };
const canAfford = (row) => Object.keys(row.cost).every(k => player.inv[k] >= row.cost[k]);
const costText = (row) => Object.keys(row.cost)
  .map(k => row.cost[k] + ' ' + COST_NAME[k]).join(' + ');

// `stock` may be a list or a function returning one — Bo's counter only has a
// row on it while you are carrying something broken.
const resolveStock = (s) => (typeof s === 'function' ? s() : s) || [];
function openTrade(who, stock, verb) {
  Trade.open = true; Trade.who = who; Trade.stock = resolveStock(stock);
  Trade.verb = verb || 'TRADE';
  Trade.pending = null;
  SFX.uiOpen();
}

function tradeBuy(n) {
  const row = Trade.stock[n - 1];
  if (!row) return;
  // A row that is spent says so in its own words where it has them — "already
  // sold" is right for a knife and wrong for a bandage.
  if (row.sold && row.sold()) {
    showMsg(row.soldText || 'Already sold', 1.5); SFX.deny(); return;
  }
  if (!canAfford(row)) { showMsg('Not enough — ' + costText(row), 1.6); SFX.deny(); return; }
  for (const k of Object.keys(row.cost)) player.inv[k] -= row.cost[k];
  row.buy();
  SFX.buy();
  saveGame();                    // every purchase is committed instantly
}

function updateMission() {
  if (mission.state === 'active' && ScrapperStats.kills >= 1 && player.inv.scrap >= 5) {
    mission.state = 'complete';
    showMsg('Objective done — return to the survivor', 3);
    SFX.chime();
    saveGame();
  }
}

// ---- explosive barrels ----
const explosions = [];   // visual flashes {x, y, t}
const fuses = [];        // chained barrels about to blow {barrel, t}

function explodeBarrel(b) {
  if (!b.alive) return;
  b.alive = false;
  const cx = b.gx + 0.5, cy = b.gy + 0.5;
  solid[b.gy][b.gx] = false;
  removeProp(b.prop);
  decals.push({ gx: cx, gy: cy, type: 'stain' });            // scorch mark
  explosions.push({ x: cx, y: cy, t: 0.35 });
  SFX.boom();
  spawnSparks(cx, cy, 26, ['#ffd27a', '#ff7a2e', '#ff5a3c', '#8a8a92'], 6);
  spawnSmoke(cx, cy, 12);
  addShake(7);
  const R = 2.3;
  // hurts you too — mind your shots
  const pd = Math.hypot(player.x - cx, player.y - cy);
  if (pd < R && player.dead <= 0) {
    player.hp -= Math.round(10 + 35 * (1 - pd / R));
    player.combatT = 0;
    player.flash = 0.3; player.iframes = 0.5;
    const kx = (player.x - cx) / (pd || 1), ky = (player.y - cy) / (pd || 1);
    tryMove(player, kx * 0.8, ky * 0.8);
    SFX.hurt();
    if (player.hp <= 0) { player.hp = 0; player.dead = 2; SFX.die(); }
  }
  // bosses shrug off half of a blast (armor plating)
  if (typeof boss !== 'undefined' && boss.active &&
      boss.state !== 'hidden' && boss.state !== 'dead') {
    const bd = Math.hypot(boss.x - cx, boss.y - cy);
    if (bd < R + boss.r) bossHit(boss.x, boss.y, Math.round(30 + 60 * (1 - Math.min(1, bd / R))), 'blast');
  }
  // shreds machines — a well-placed barrel one-shots a Scrapper, and with two
  // of them in the yard one blast can take both
  for (const sc of scrappers) {
    if (sc.state === 'off' || sc.state === 'dead') continue;
    const sd = Math.hypot(sc.x - cx, sc.y - cy);
    if (sd >= R) continue;
    sc.hp -= Math.round(30 + 60 * (1 - sd / R));
    sc.hitFlash = 0.1;
    sc.alert = 1;                       // survivors of the blast come for you
    if (sc.hp <= 0) killScrapper(sc);
    else sc.state = 'chase';
  }
  // a fuel pump going up beside a checkpoint is a legitimate way to take one
  for (const bd of bandits) {
    if (bd.dead) continue;
    const bdd = Math.hypot(bd.x - cx, bd.y - cy);
    if (bdd >= R) continue;
    alertBlock(bd.block, player.x, player.y, true);
    banditHit(bd, Math.round(30 + 60 * (1 - bdd / R)),
              (bd.x - cx) / (bdd || 1), (bd.y - cy) / (bdd || 1), false);
  }
  // chain reaction with nearby barrels
  for (const ob of boomBarrels) {
    if (ob.alive && Math.hypot(ob.gx - b.gx, ob.gy - b.gy) < R) {
      fuses.push({ barrel: ob, t: 0.15 + Math.random() * 0.12 });
    }
  }
  saveGame();                    // destroyed barrels are permanent world state
}

function updateExplosions(dt) {
  for (let i = fuses.length - 1; i >= 0; i--) {
    fuses[i].t -= dt;
    if (fuses[i].t <= 0) { explodeBarrel(fuses[i].barrel); fuses.splice(i, 1); }
  }
  for (let i = explosions.length - 1; i >= 0; i--) {
    explosions[i].t -= dt;
    if (explosions[i].t <= 0) explosions.splice(i, 1);
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
      SFX.ricochet();
      for (const bb of boomBarrels) {
        if (bb.alive && Math.hypot(b.x - bb.gx - 0.5, b.y - bb.gy - 0.5) < 0.8) {
          explodeBarrel(bb);
          break;
        }
      }
    }
    if (!hit && typeof boss !== 'undefined' && boss.active &&
        boss.state !== 'hidden' && boss.state !== 'dead' &&
        Math.hypot(b.x - boss.x, b.y - boss.y) < boss.r + 0.15) {
      hit = true;
      bossHit(b.x, b.y, b.dmg || 10, 'bullet');
    }
    if (!hit) {
      for (const sc of scrappers) {
        if (sc.state === 'dead' || sc.state === 'off') continue;
        if (Math.hypot(b.x - sc.x, b.y - sc.y) >= 0.45) continue;
        hit = true;
        sc.hp -= (b.dmg || 10);
        sc.hitFlash = 0.08;
        sc.kbx += b.vx * 0.02; sc.kby += b.vy * 0.02;
        spawnSparks(b.x, b.y, 6, ['#ffd27a', '#ffb02e', '#8a8a92']);
        addShake(0.8);
        SFX.hitMetal();
        if (sc.hp <= 0) killScrapper(sc);
        break;                          // one bullet, one machine
      }
    }
    if (!hit && typeof droidBulletHit === 'function' && droidBulletHit(b)) hit = true;
    if (!hit) {
      for (const bd of bandits) {
        if (bd.dead) continue;
        if (Math.hypot(b.x - bd.x, b.y - bd.y) >= 0.45) continue;
        hit = true;
        banditHit(bd, b.dmg || 10, b.vx * 0.1, b.vy * 0.1, false);
        break;                          // one bullet, one raider
      }
    }
    if (hit) bullets.splice(i, 1);
  }
}

function killScrapper(s) {
  s.state = 'dead';
  s.looted = false;
  s.respawn = 20;               // lingers as a lootable wreck; 4s after looting
  ScrapperStats.kills++;
  SFX.robotDie();
  addShake(2.5);
  spawnSparks(s.x, s.y, 12, ['#ffd27a', '#ffb02e', '#8a8a92'], 3);
  spawnSmoke(s.x, s.y, 5);
}

function updateScrappers(dt) {
  if (!currentAreaDef().hasScrapper) return;
  for (const s of scrappers) updateScrapper(dt, s);
}

function updateScrapper(dt, s) {
  if (s.state === 'off') return;      // yard is quiet until the NPC's warning
  s.hitFlash -= dt;
  if (s.kbx || s.kby) {
    tryMove(s, s.kbx, s.kby);
    s.kbx *= 0.7; s.kby *= 0.7;
    if (Math.abs(s.kbx) + Math.abs(s.kby) < 0.001) { s.kbx = 0; s.kby = 0; }
  }

  if (s.state === 'dead') {
    s.respawn -= dt;
    if (s.respawn <= 0) spawnScrapper(s);
    return;
  }

  const playerSafe = insideShack(player.x, player.y);
  const distP = Math.hypot(player.x - s.x, player.y - s.y);
  s.animT += dt;
  if (s.animT > 0.22) { s.animT = 0; s.frame = 1 - s.frame; }

  switch (s.state) {
    case 'patrol': {
      // gradual detection: machines don't magically know where you are.
      // Their sight (4.5) is shorter than yours; crouching shrinks it to 2.2.
      // It now goes through canSpot, so it has to be LOOKING at you and there
      // has to be nothing between — a heap you stand behind is real cover, and
      // that is the whole point of the crouch key.
      const sightR = player.crouch ? 2.2 : 4.5;
      if (!playerSafe && canSpot(s, sightR)) {
        if (canSpot(s, PERIPHERAL + 0.1)) s.alert = 1;   // right on top of it
        else s.alert += dt * (0.5 + 1.6 * (1 - distP / sightR));
      } else {
        s.alert = Math.max(0, s.alert - dt * 0.5);
      }
      if (s.alert > 0.15) tutStealth();
      if (s.alert >= 1) {
        s.state = 'chase';
        s.memory = 12;
        s.lastPX = player.x; s.lastPY = player.y;
        SFX.alert();
        tutEnemy();
        break;
      }
      // walk heap to heap, pausing to "scan" — and the scan is real now: it
      // sweeps its sensor either side of the way it was walking, so a stopped
      // machine is not permanently blind down one side of itself.
      if (s.idleT > 0) {
        s.idleT -= dt;
        s.scan += dt * 1.1;
        const a = Math.atan2(s.fy, s.fx) + Math.sin(s.scan) * 0.5 * dt * 4;
        faceToward(s, Math.cos(a), Math.sin(a), dt);
        break;
      }
      aiMove(s, s.tx, s.ty, 1.4 * dt, dt);
      if (Math.hypot(s.tx - s.x, s.ty - s.y) < 0.8) {
        s.idleT = 0.8 + Math.random() * 1.6;
        // every route alternates: scrap heap → the hub by the shack → heap...
        s.patrolFlip = !s.patrolFlip;
        const p = s.patrolFlip ? patrolCenter : patrolPoints[(Math.random() * patrolPoints.length) | 0];
        if (p) { s.tx = p.x; s.ty = p.y; }
      }
      break;
    }
    case 'chase': {
      player.combatT = 0;      // being hunted counts as combat — no regen
      // 12-second memory: losing sight doesn't shake them immediately —
      // they push toward where they last saw you until the memory fades
      // A chase you cannot break is not a chase. Losing sight now means losing
      // sight: put something solid between you and it pushes to where you were
      // last, then gives up when the memory runs out. Its cone is wider once it
      // is hunting — it is actively looking for you, not walking a route.
      const seesYou = !playerSafe && canSpotWide(s, 7.5);
      if (seesYou) {
        s.memory = 12;
        s.lastPX = player.x; s.lastPY = player.y;
      } else {
        s.memory -= dt;
      }
      if (s.memory <= 0) {
        s.alert = 0.35;
        s.state = 'patrol';
        const p = patrolPoints[(Math.random() * patrolPoints.length) | 0];
        if (p) { s.tx = p.x; s.ty = p.y; }
        break;
      }
      aiMove(s, seesYou ? player.x : s.lastPX, seesYou ? player.y : s.lastPY, 2.5 * dt, dt);
      if (seesYou && distP < 0.95) { s.state = 'windup'; s.t = 0.45; s.didHit = false; SFX.charge(); }
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
          player.combatT = 0;
          player.iframes = 0.5; player.flash = 0.28;
          addShake(4);
          spawnSparks(player.x, player.y, 5, ['#ff5a3c', '#ffb02e']);
          const kx = (player.x - s.x) / (d || 1), ky = (player.y - s.y) / (d || 1);
          tryMove(player, kx * 0.5, ky * 0.5);
          SFX.hurt();
          if (player.hp <= 0) { player.hp = 0; player.dead = 2; SFX.die(); }
        }
      }
      s.t -= dt;
      if (s.t <= 0) { s.state = 'recover'; s.t = 0.45; }
      break;
    }
    case 'recover': {
      s.t -= dt;
      if (s.t <= 0) {
        if (distP < 5.5 && !playerSafe) s.state = 'chase';
        else { s.alert = 0.35; s.state = 'patrol'; }
      }
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
  // it looks where it is going. Every walker goes through here, so this is the
  // one place a facing has to be kept up to date.
  faceToward(s, bx, by, dt);
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


// =====================================================================
// THE BANDITS — four to a roadblock, holding the road to the church.
//
// They are the first PEOPLE you fight, and everything about how they behave
// is meant to say so. The machines in the yard hunt you as individuals: each
// Scrapper notices you on its own and comes on its own. These do not. One of
// them sees you and SHOUTS, and the whole block turns at once — that is the
// difference between a patrol and a gang, and it is the thing that makes a
// checkpoint feel like a checkpoint.
//
// The four roles are a rock-paper-scissors you read at a glance:
//   two KNIVES   come at you and will not stop; fast, fragile, no reach
//   one PISTOL   holds the middle distance and keeps walking to hold it
//   one RIFLE    stands furthest back behind the tall screen and takes
//                the whole road under aim; the slowest and hardest hit
// Kill order is the skill: rush the rifle and the knives are on you, hold
// back and the rifle picks you apart. The gap in the barricade is the fight —
// it is the only place any of them can see you from.
// =====================================================================
const BANDIT_ROLES = {
  // Tuned against a player standing in the gap doing nothing: four of them
  // took a passive 100 HP down in about six seconds, which is a wall, not a
  // fight. Softened to roughly nine — long enough that someone carrying only
  // the pipe can back out through the chicane and take them a piece at a time,
  // still short enough that standing in the open is a death sentence.
  knife: {
    hp: 34, sight: 7.0, speed: 3.1, dmg: 10, reach: 1.15,
    windup: 0.38, swing: 0.15, recover: 0.58,
  },
  pistol: {
    hp: 30, sight: 8.5, speed: 2.5, dmg: 7,
    range: [2.6, 7.5], hold: 4.8, cd: 1.35, aim: 0.36, spread: 0.11, speedB: 10.5,
  },
  rifle: {
    hp: 26, sight: 11.5, speed: 2.0, dmg: 16,
    range: [3.2, 15.0], hold: 9.0, cd: 2.7, aim: 1.05, spread: 0.03, speedB: 17,
  },
};

const bandits = [];
const foeBullets = [];        // theirs, so they can be told from yours on sight

function makeBandit(block, post, idx) {
  const cfg = BANDIT_ROLES[post.role];
  return {
    x: post.x, y: post.y, r: 0.26,
    homeX: post.x, homeY: post.y,
    block, idx, role: post.role, v: post.v || 0,
    hp: cfg.hp, maxHp: cfg.hp,
    state: 'guard', t: 0, cd: 0, aimT: 0,
    animT: 0, frame: 0, hitFlash: 0, muzzle: 0,
    alert: 0, memory: 0, lastPX: post.x, lastPY: post.y,
    kbx: 0, kby: 0, detour: 0, detourX: 0, detourY: 0,
    idleT: Math.random() * 2, sway: Math.random() * 6.28,
    dead: false, looted: false, fell: 0, deadT: 0,
    // A guard watches the road he was put on: `facing` is the side you arrive
    // from, so that is the way he looks, and his sweep swings either side of it.
    faceX: block.facing, faceY: 0,
    fx: block.facing, fy: 0, scan: Math.random() * 6.28,
  };
}

function spawnBandits() {
  bandits.length = 0;
  foeBullets.length = 0;
  if (!currentAreaDef().hasBandits) return;
  for (const rb of roadblocks) {
    rb.cleared = false;
    rb.posts.forEach((post, i) => bandits.push(makeBandit(rb, post, i)));
  }
}
// a body that is already down when you arrive — restored from the save
function banditKey(b) { return b.block.id + ':' + b.idx; }

// ---- can this one actually see that spot, or is its own barricade in the way?
// ---------- CAN IT SEE YOU ----------
// One answer, for every machine and every raider in the game. It has to be one
// function: "can it see me" is the whole of stealth, and if a Scrapper and a
// bandit answer it differently then hiding is guesswork rather than a skill.
//
// Three tests, in the order that costs least:
//   RANGE      — how far this thing can see at all, halved when you crouch
//   ARC        — it has to be LOOKING at you. A 120 degree forward cone, with a
//                small all-round bubble so you cannot stand on its heel.
//   COVER      — and nothing solid in between.
//
// The cover test is what makes buildings, dumpsters, cars, walls and the
// junkyard's trash mountains into real cover. Before it, detection was radius
// only: a Scrapper "saw" you through a shack, and in a city of solid buildings
// that would have been nonsense.
// HOW LONG THE DEAD LIE THERE. One number for every kind of enemy, because a
// street that keeps its bodies forever stops reading as a place people live in
// — and because the player should not have to wonder which corpses are still
// worth searching. Loot it inside the minute or it is gone.
const CORPSE_LINGER = 45;    // seconds lying there, fully lootable
const CORPSE_FADE = 5;       // then this long fading out

const VISION_ARC = Math.cos(60 * Math.PI / 180);   // 120 degrees, total
const PERIPHERAL = 1.5;                            // inside this, facing stops mattering
// `arcCos` lets a caller widen the cone for its own kind — the droid roster
// always carried a per-unit `arc` and nothing ever read it, so every machine in
// the city was squinting down the same 120 degrees as a yard Scrapper.
function canSpot(e, range, arcCos) {
  if (player.dead > 0) return false;
  const dx = player.x - e.x, dy = player.y - e.y;
  const d = Math.hypot(dx, dy);
  if (d > range) return false;
  if (d > PERIPHERAL) {
    const f = Math.hypot(e.fx, e.fy);
    const lim = (arcCos === undefined) ? VISION_ARC : arcCos;
    if (f > 0.001 && (dx * e.fx + dy * e.fy) / (d * f) < lim) return false;
  }
  return losClear(e.x, e.y, player.x, player.y);
}
// Something already hunting you sweeps a much wider arc — near enough all
// round, minus what is directly behind it. Cover still breaks it.
const WIDE_ARC = Math.cos(140 * Math.PI / 180);
function canSpotWide(e, range) {
  if (player.dead > 0) return false;
  const dx = player.x - e.x, dy = player.y - e.y;
  const d = Math.hypot(dx, dy);
  if (d > range) return false;
  if (d > PERIPHERAL) {
    const f = Math.hypot(e.fx, e.fy);
    if (f > 0.001 && (dx * e.fx + dy * e.fy) / (d * f) < WIDE_ARC) return false;
  }
  return losClear(e.x, e.y, player.x, player.y);
}
// where a unit is looking, as a unit vector, turned smoothly rather than snapped
function faceToward(e, dx, dy, dt) {
  const d = Math.hypot(dx, dy);
  if (d < 0.001) return;
  const k = Math.min(1, 9 * (dt || 1));
  e.fx += (dx / d - e.fx) * k;
  e.fy += (dy / d - e.fy) * k;
}

function losClear(x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const n = Math.ceil(Math.hypot(dx, dy) * 3);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (isSolid(x0 + dx * t, y0 + dy * t)) return false;
  }
  return true;
}

// One of them calls it and the whole block comes. This is the single most
// important line in the file: without it four bandits are four separate
// fights, and a roadblock stops being a roadblock.
function alertBlock(block, px, py, shout) {
  let woke = false;
  for (const b of bandits) {
    if (b.block !== block || b.dead) continue;
    if (b.memory <= 0) woke = true;
    b.memory = 14;
    b.lastPX = px; b.lastPY = py;
    if (b.state === 'guard') { b.state = 'fight'; b.alert = 1; }
  }
  if (woke && shout) SFX.shout();
}

function killBandit(b) {
  b.dead = true;
  b.state = 'dead';
  b.looted = false;
  b.fell = 0.35;
  b.deadT = 0;
  SFX.banditDie();
  addShake(2);
  spawnSmoke(b.x, b.y, 3);
  const rb = b.block;
  if (!rb.cleared && bandits.every(o => o.block !== rb || o.dead)) {
    rb.cleared = true;
    showMsg('THE ROAD IS CLEAR', 3);
    SFX.chime();
  }
  saveGame();
}

function banditHit(b, dmg, kx, ky, stab) {
  if (b.dead) return;
  b.hp -= dmg;
  b.hitFlash = 0.09;
  b.kbx += kx * (stab ? 0.06 : 0.11);
  b.kby += ky * (stab ? 0.06 : 0.11);
  // they are not machines: no sparks, no glow, a dull sound and a stagger
  spawnSparks(b.x, b.y, 4, ['#7d211c', '#a8342c', '#4a3d32']);
  SFX.thud();
  alertBlock(b.block, player.x, player.y, true);
  if (b.hp <= 0) killBandit(b);
}

function foeShot(b, tx, ty, cfg, sound) {
  const dx = tx - b.x, dy = ty - b.y;
  const d = Math.hypot(dx, dy) || 1;
  const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * cfg.spread * 2;
  foeBullets.push({
    x: b.x + Math.cos(a) * 0.4, y: b.y + Math.sin(a) * 0.4,
    vx: Math.cos(a) * cfg.speedB, vy: Math.sin(a) * cfg.speedB,
    life: 1.1, dmg: cfg.dmg, heavy: b.role === 'rifle',
  });
  b.muzzle = 0.07;
  if (sound) sound();
  addShake(b.role === 'rifle' ? 1.4 : 0.7);
}

// Where should this one walk to? If the player is on the far side of the
// barricade, the answer is NOT "at the player" — it is "at the gap", or they
// grind against their own wall and the fight never happens.
function banditGoal(b, px, py) {
  const rb = b.block;
  const side = (v) => (v - rb.lineX) * rb.facing > 0;   // true = the way in
  if (side(b.x) === side(px)) return { x: px, y: py, via: false };
  // Aim THROUGH the chicane, not AT it. Pointed at the gap itself they walked
  // up, arrived, and stood in the hole forever — the whole block piled into
  // the doorway and the player watched them from six feet away.
  const dir = side(px) ? 1 : -1;
  return { x: rb.gate.x + rb.facing * dir * 1.9, y: rb.gate.y, via: true };
}

function updateBandits(dt) {
  if (!currentAreaDef().hasBandits) return;
  for (const b of bandits) updateBandit(dt, b);
}

function updateBandit(dt, b) {
  b.hitFlash -= dt;
  b.muzzle -= dt;
  if (b.kbx || b.kby) {
    tryMove(b, b.kbx, b.kby);
    b.kbx *= 0.7; b.kby *= 0.7;
    if (Math.abs(b.kbx) + Math.abs(b.kby) < 0.001) { b.kbx = 0; b.kby = 0; }
  }
  if (b.dead) { if (b.fell > 0) b.fell -= dt; b.deadT += dt; return; }

  const cfg = BANDIT_ROLES[b.role];
  const dist = Math.hypot(player.x - b.x, player.y - b.y);
  const alive = player.dead <= 0;
  b.animT += dt;
  if (b.animT > 0.2) { b.animT = 0; b.frame = 1 - b.frame; }
  b.cd -= dt;

  // ---- noticing you ----
  if (b.state === 'guard') {
    const sight = player.crouch ? cfg.sight * 0.45 : cfg.sight;
    // They already had cover; now they have a FACING too, and the sweep below
    // turns it. A man watching the road is not watching the whole world.
    if (canSpot(b, 1.8)) b.alert = 1;
    else if (canSpot(b, sight)) b.alert += dt * (0.55 + 1.5 * (1 - dist / sight));
    else b.alert = Math.max(0, b.alert - dt * 0.7);
    // NOT tutStealth() — that one says "a machine noticed movement", and
    // these are not machines. It also freezes the world the moment the bar
    // twitches, which left the whole block standing at ease while the player
    // walked up and stood on their boots.
    if (b.alert >= 1) {
      alertBlock(b.block, player.x, player.y, true);
      tutBandit();
      return;
    }
    // idling at the post: they shift their weight and look up and down the
    // road. That sweep is real now — the arc it turns is the arc it sees in,
    // so a guard genuinely has a moment when he is looking the other way.
    b.sway += dt;
    b.scan += dt * 0.7;
    const base = Math.atan2(b.faceY || 1, b.faceX || 0);
    const a = base + Math.sin(b.scan) * 0.8;
    faceToward(b, Math.cos(a), Math.sin(a), dt * 0.6);
    if (b.idleT > 0) { b.idleT -= dt; return; }
    const dh = Math.hypot(b.homeX - b.x, b.homeY - b.y);
    if (dh > 0.6) aiMove(b, b.homeX, b.homeY, cfg.speed * 0.5 * dt, dt);
    else { b.idleT = 1.2 + Math.random() * 2.2; b.frame = 0; }
    return;
  }

  // ---- fighting ----
  const seen = alive && dist < cfg.sight * 1.25 && losClear(b.x, b.y, player.x, player.y);
  if (seen) { b.memory = 14; b.lastPX = player.x; b.lastPY = player.y; }
  else b.memory -= dt;
  if (b.memory <= 0 && b.state !== 'windup' && b.state !== 'swing') {
    b.state = 'guard'; b.alert = 0.3; b.aimT = 0;
    return;
  }
  player.combatT = 0;
  const tx = seen ? player.x : b.lastPX, ty = seen ? player.y : b.lastPY;

  if (b.role === 'knife') {
    switch (b.state) {
      case 'fight': {
        const goal = banditGoal(b, tx, ty);
        aiMove(b, goal.x, goal.y, cfg.speed * dt, dt);
        if (seen && dist < cfg.reach * 0.82) {
          b.state = 'windup'; b.t = cfg.windup;
          SFX.charge();
        }
        break;
      }
      case 'windup':
        b.t -= dt;
        if (b.t <= 0) { b.state = 'swing'; b.t = cfg.swing; b.didHit = false; SFX.stab(); }
        break;
      case 'swing':
        if (!b.didHit) {
          b.didHit = true;
          if (dist < cfg.reach && player.iframes <= 0 && player.dead <= 0) hurtPlayer(cfg.dmg, b.x, b.y);
        }
        b.t -= dt;
        if (b.t <= 0) { b.state = 'recover'; b.t = cfg.recover; }
        break;
      case 'recover':
        b.t -= dt;
        if (b.t <= 0) b.state = 'fight';
        break;
      default: b.state = 'fight';
    }
    return;
  }

  // ---- the two shooters. Same shape, very different numbers: the pistol
  // fidgets in and out of its band and fires often, the rifle plants itself,
  // takes a long visible aim and hits like a truck.
  const clear = seen && dist >= cfg.range[0] && dist <= cfg.range[1];
  if (b.state === 'aim') {
    b.aimT += dt;
    b.t -= dt;
    // lose sight mid-aim and the shot is thrown away — break the line and live
    if (!clear) { b.state = 'fight'; b.aimT = 0; b.cd = 0.35; }
    else if (b.t <= 0) {
      foeShot(b, player.x, player.y, cfg, b.role === 'rifle' ? SFX.rifleShot : SFX.shot);
      b.state = 'fight'; b.aimT = 0; b.cd = cfg.cd;
    }
    return;
  }
  b.aimT = 0;
  // hold the band: too close and they give ground, too far and they close in
  const goal = banditGoal(b, tx, ty);
  if (goal.via) {
    aiMove(b, goal.x, goal.y, cfg.speed * dt, dt);
  } else if (dist < cfg.range[0]) {
    aiMove(b, b.x - (player.x - b.x), b.y - (player.y - b.y), cfg.speed * 1.15 * dt, dt);
  } else if (dist > cfg.hold || !seen) {
    aiMove(b, tx, ty, cfg.speed * dt, dt);
  } else if (b.cd > 0) {
    // sidestep while reloading, so a shooter is never a stationary target
    const a = Math.atan2(player.y - b.y, player.x - b.x) + Math.PI / 2;
    aiMove(b, b.x + Math.cos(a), b.y + Math.sin(a), cfg.speed * 0.55 * dt, dt);
  }
  if (clear && b.cd <= 0) { b.state = 'aim'; b.t = cfg.aim; }
}

function hurtPlayer(dmg, fromX, fromY) {
  player.hp -= dmg;
  player.combatT = 0;
  player.iframes = 0.45; player.flash = 0.28;
  addShake(4);
  spawnSparks(player.x, player.y, 5, ['#ff5a3c', '#ffb02e']);
  const d = Math.hypot(player.x - fromX, player.y - fromY) || 1;
  tryMove(player, ((player.x - fromX) / d) * 0.45, ((player.y - fromY) / d) * 0.45);
  SFX.hurt();
  if (player.hp <= 0) { player.hp = 0; player.dead = 2; SFX.die(); }
}

function updateFoeBullets(dt) {
  for (let i = foeBullets.length - 1; i >= 0; i--) {
    const b = foeBullets[i];
    b.life -= dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    let hit = b.life <= 0;
    if (isSolid(b.x, b.y)) {
      hit = true;
      spawnSparks(b.x, b.y, 3, ['#ffd27a', '#c9c9d2']);
      SFX.ricochet();
      for (const bb of boomBarrels) {
        if (bb.alive && Math.hypot(b.x - bb.gx - 0.5, b.y - bb.gy - 0.5) < 0.8) { explodeBarrel(bb); break; }
      }
    }
    if (!hit && player.dead <= 0 && player.iframes <= 0 &&
        Math.hypot(b.x - player.x, b.y - player.y) < 0.42) {
      hit = true;
      hurtPlayer(b.dmg, b.x - b.vx, b.y - b.vy);
    }
    if (hit) foeBullets.splice(i, 1);
  }
}

function tutBandit() {
  tutShow('bandit',
    ['Raiders hold this road. One sees you,', 'they all come. The knives reach you first —',
     'the rifle at the back is the one to fear.'],
    'any', 'PRESS ANY KEY');
}

function updateNpc(dt) {
  npc.animT += dt;
  if (npc.animT > 0.6) { npc.animT = 0; npc.frame = 1 - npc.frame; }
  // the camp breathes on its own clock, so seven people are not all shifting
  // their weight on the same frame
  for (const f of folk) {
    f.animT += dt;
    if (f.animT > 0.55 + (f.x % 1) * 0.5) { f.animT = 0; f.frame = 1 - f.frame; }
  }
}

function tutEnemy() {
  tutShow('enemy',
    ['Scrappers hunt these grounds.', 'They flash red before they strike —', 'back off, then hit them at max range.'],
    'any', 'PRESS ANY KEY');
}

function tutStealth() {
  tutShow('stealth',
    ['A machine noticed movement.', 'Hold SHIFT to crouch — much harder', 'to spot. Outrun their sight to escape.'],
    'any', 'PRESS ANY KEY');
}
