// Save system - browser localStorage, versioned, autosaving.
// DESIGN RULE: a save must survive the game being updated. Fields are merged
// onto live defaults (never replace wholesale), unknown/missing fields fall
// back, world objects are matched by POSITION not array index (map layouts
// change), and the player is never restored inside newly-added geometry.
// Testing writes to a scratch slot so a real run can never be clobbered.
const SAVE_KEY_REAL = 'coreshutdown_save_v1';
const SAVE_KEY_TEST = 'coreshutdown_save_test';
const saveKey = () => (window.TEST_MODE ? SAVE_KEY_TEST : SAVE_KEY_REAL);
const SAVE_VERSION = 3;

let playerName = '';

// The ledger for MILESTONE_GRANTS (js/items.js): which back-payments this run
// has already been settled for. Written into the save, so each one happens at
// most once ever, and a thing you were given and then spent is never re-handed.
let granted = {};

function saveGame() {
  // only ever persist real gameplay - never menu/test/title/arena states
  if (window.ARENA_MODE) return;
  if (typeof GameState !== 'undefined' && GameState !== 'playing') return;
  try {
    const d = {
      v: SAVE_VERSION,
      name: playerName,
      player: {
        x: player.x, y: player.y, hp: player.hp,
        arms: JSON.parse(JSON.stringify(player.arms)),
        mods: JSON.parse(JSON.stringify(player.mods)),
        melee: player.melee, hasGun: player.hasGun, active: player.active, gun: player.gun,
        owned: { ...player.owned }, inv: { ...player.inv },
        respawnX: player.respawnX, respawnY: player.respawnY,
        respawnArea: player.respawnArea, homeSet: player.homeSet,
        scrollHintT: Math.max(0, player.scrollHintT),
      },
      mission: mission.state,
      kills: ScrapperStats.kills,
      techPity: ScrapperStats.techPity,
      bossDown: typeof bossDefeated !== 'undefined' ? bossDefeated : false,
      area: currentArea,
      // per-area world state, keyed by tile so map edits can't shuffle it
      areas: collectAreaState(),
      fog: collectFog(),
      tut: { ...Tut.done },
      // the camp's map table only pays out once
      campMap: typeof campMapRead !== 'undefined' ? campMapRead : false,
      // and so does every milestone back-payment
      granted: { ...granted },
    };
    localStorage.setItem(saveKey(), JSON.stringify(d));
  } catch (e) { /* storage full or blocked - play on without saving */ }
}

// explored ground, one packed string per area
function collectFog() {
  const out = {};
  for (const id of Object.keys(exploredByArea)) {
    // the prologue is a memory, not ground the traveller has walked — writing
    // its fog would put a street from a year ago in every save file forever
    if (Areas[id] && Areas[id].memory) continue;
    out[id] = fogToString(exploredByArea[id]);
  }
  return out;
}

// every area's remembered state, with the live area folded in
function collectAreaState() {
  const all = {};
  for (const id of Object.keys(areaState)) all[id] = areaState[id];
  // the live area, from the SAME snapshot walking out of a door uses — this
  // used to be a second hand-written copy that had never heard of chests
  all[currentArea] = snapshotArea();
  return all;
}

function loadSaveData() {
  try {
    const raw = localStorage.getItem(saveKey());
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object' || !d.player) return null;
    return migrate(d);
  } catch (e) { return null; }
}

// old saves are UPGRADED, never discarded
function migrate(d) {
  if (d.area === 'approach') d.area = 'fringe';   // the scrapped area
  if (d.areas && d.areas.approach) { delete d.areas.approach; }
  if (!d.v || d.v < 2) {
    // v1 -> v2: barrels/items were stored by array index; translate what we can
    if (Array.isArray(d.barrels)) {
      d.deadBarrels = [];
      d.barrels.forEach((alive, i) => {
        const b = boomBarrels[i];
        if (b && !alive) d.deadBarrels.push(b.gx + ',' + b.gy);
      });
    }
    if (Array.isArray(d.items)) {
      const kept = new Set(d.items.map(it =>
        it.type + '@' + Number(it.x).toFixed(1) + ',' + Number(it.y).toFixed(1)));
      d.takenItems = START_ITEMS.filter(k => !kept.has(k));
    }
    d.v = 2;
  }
  if (d.v < 3) {
    // v2 -> v3: single-map state becomes per-area state (it was the junkyard)
    d.areas = { junkyard: { deadBarrels: d.deadBarrels || [], takenItems: d.takenItems || [] } };
    d.area = 'junkyard';
    d.v = 3;
  }
  if (!Areas[d.area]) d.area = 'junkyard';   // an area we no longer ship
  if (!d.name) d.name = 'TRAVELLER';         // never throw a run away over a blank name
  return d;
}

// A NEW RUN OWES THE OLD ONE NOTHING.
//
// This used to clear the milestone ledger and the rifle's parts, and that was
// all — because a page load cleared everything else for free, and nobody had
// started over WITHOUT one. Choosing [N] in the same session actually handed
// the new traveller the whole previous run: the rifle, the scrap, the rounds,
// the Compactor already dead, the camp's map already read, and every tutorial
// already seen. A "new game" that begins with the first quest finished is not
// a new game.
//
// Every field is poured back from PLAYER_DEFAULTS, captured in js/entities.js
// from the literal itself, so adding a field to the player cannot leave a hole
// here. The rest is the handful of globals a run keeps outside that object.
function resetRun() {
  Object.assign(player, JSON.parse(JSON.stringify(PLAYER_DEFAULTS)));
  player.mods = freshMods();
  modsChanged();
  playerName = '';
  granted = {};
  mission.state = 'none';
  bossDefeated = false;
  campMapRead = false;
  ScrapperStats.kills = 0;
  ScrapperStats.techPity = 0;
  Tut.active = null;
  Tut.done = {};
  // and it has not been anywhere: the world's remembered state, the fog, and
  // the map's pictures of that fog
  for (const id of Object.keys(areaState)) delete areaState[id];
  for (const id of Object.keys(exploredByArea)) delete exploredByArea[id];
  for (const id of Object.keys(mapThumbs)) delete mapThumbs[id];
  initFog(currentArea);          // `explored` still pointed at the old array
}

function wipeSave() {
  try { localStorage.removeItem(saveKey()); } catch (e) {}
  resetRun();
}

const num = (v, fallback) => (typeof v === 'number' && isFinite(v)) ? v : fallback;

// AMMUNITION, across all three shapes it has ever had in a save file. None of
// them is allowed to lose a round, because every one of them was only ever a
// change of REPRESENTATION of the same thing the player is carrying:
//   1. `ammo` / `ammoRifle`     — one number per gun, before reloading existed
//   2. `arms[gun].spares[]`     — the magazine pouch, briefly
//   3. `arms[gun].reserve`      — loose rounds in a pocket, now
// A pouch converts by pouring every spare back into the pocket; a plain number
// converts by filling the gun first and pocketing the rest.
function bagRounds(gun, total) {
  const cap = capOf(gun), A = magsOf(gun);
  const left = Math.max(0, Math.floor(total));
  A.loaded = Math.min(cap, left);
  A.reserve = left - A.loaded;
}
// WEAPON PARTS. A run that predates the bench simply arrives with every slot
// standard — there is nothing to convert, because a gun with no parts on it is
// what the standard parts describe. What this DOES have to survive is the part
// list changing: an id this build no longer ships falls back to standard
// rather than leaving a slot holding nothing, and an owned id we do not
// recognise is dropped. Rule 6 — a save is upgraded, never refused.
function loadMods(p) {
  player.mods = freshMods();
  const src = p.mods;
  if (!src) return;
  for (const id of Object.keys(src.owned || {}))
    if (PARTS[id] && !PARTS[id].std && src.owned[id]) player.mods.owned[id] = true;
  for (const gun of Object.keys(player.mods.fitted)) {
    const want = (src.fitted || {})[gun] || {};
    for (const s of slotsOf(gun)) {
      const id = want[s.id], part = PARTS[id];
      // and a part you no longer own cannot stay bolted on
      if (part && part.gun === gun && part.slot === s.id && ownsPart(id))
        player.mods.fitted[gun][s.id] = id;
    }
  }
  modsChanged();
}

function loadArms(p) {
  for (const gun of ['pistol', 'rifle']) {
    const A = magsOf(gun);
    A.loaded = 0; A.reserve = 0;
  }
  if (p.arms) {
    for (const gun of ['pistol', 'rifle']) {
      const src = p.arms[gun];
      if (!src) continue;
      const A = magsOf(gun), cap = capOf(gun);
      // more in the gun than it now holds — a drum save read by a build that
      // no longer has the drum. The overflow goes in the pocket; NOTHING is
      // lost by a part list changing under a run.
      const want = Math.max(0, num(src.loaded, 0));
      A.loaded = Math.min(cap, want);
      A.reserve = Math.max(0, num(src.reserve, 0)) + (want - A.loaded);
      // the magazine pouch, emptied into the pocket round for round
      if (Array.isArray(src.spares))
        for (const n of src.spares) A.reserve += Math.max(0, num(n, 0));
    }
  } else {
    // ...and a run from before any of this
    bagRounds('pistol', num(p.ammo, 0));
    bagRounds('rifle', num(p.ammoRifle, 0));
  }
}

// pour a loaded save back into the live game state, defensively
// EVERYWHERE YOU HAVE BEEN, UNPACKED AND PHOTOGRAPHED.
//
// A map thumbnail is a picture of an area's tile arrays, and only ONE area's
// tile arrays exist at a time — so thumbnails were only ever taken on the way
// OUT of an area, in stashArea(). That works inside a session and is useless
// across one: `mapThumbs` lives in memory and a save does not carry it. So a
// returning player's world map showed the area they had loaded into and nothing
// else, however far they had walked — press M in the Fringe and the junkyard
// was simply not there. It only became obvious when the map started opening on
// the whole ring instead of on the area you were standing in.
//
// Every area the save has fog for is built once here, its fog unpacked at its
// own size, and a thumbnail taken before it is thrown away again. The caller
// rebuilds the area the save is in afterwards, so the live arrays end up right.
//
// Unpacking the fog HERE also fixes the size guess it used to be done with:
// `id === currentArea ? MAP_W : (id === 'fringe' ? FRINGE_W : 32)` — a table of
// two areas and a default, which would have silently decoded the next 64x64
// area's fog as 32x32. Each area is built before its fog is read, so each one
// answers for its own size.
function loadFogAndThumbs(fogData) {
  if (!fogData) return;
  for (const id of Object.keys(Areas)) {
    const def = Areas[id];
    // a memory is not ground the traveller has walked, and never gets a pin,
    // a thumbnail or a line in the save
    if (def.memory || !fogData[id]) continue;
    currentArea = id;
    def.build();
    initFog(id);                                   // sized from what was just built
    exploredByArea[id] = fogFromString(fogData[id], fogW * fogH);
    explored = exploredByArea[id];
    buildMapThumb(id);          // which refuses an area with nothing explored
  }
}

function applySave(d) {
  playerName = d.name;
  const p = d.player || {};

  // numbers are validated so a missing/garbage field can never poison the sim
  player.x = num(p.x, player.x);
  player.y = num(p.y, player.y);
  player.hp = Math.min(player.maxHp, Math.max(1, num(p.hp, player.maxHp)));
  // parts BEFORE rounds: a drum makes the gun hold 24, and loadArms clamps
  // what is in it to the capacity the parts decide
  loadMods(p);
  loadArms(p);
  player.respawnX = num(p.respawnX, player.respawnX);
  player.respawnY = num(p.respawnY, player.respawnY);
  // A save written before bays could be claimed has no respawn area in it, and
  // there was only one place it could have meant: the shack. Migration is the
  // default, not a conversion step.
  player.respawnArea = p.respawnArea || 'junkyard';
  player.scrollHintT = num(p.scrollHintT, 0);
  player.homeSet = !!p.homeSet;
  player.melee = (p.melee === 'pipe' || p.melee === 'knife') ? p.melee : null;
  player.hasGun = !!p.hasGun;
  player.active = p.active === 'gun' ? 'gun' : 'melee';
  // merge onto defaults so fields added in later updates keep their default
  player.owned = Object.assign({ pipe: false, knife: false, pistol: false, rifle: false }, p.owned || {});
  player.gun = (p.gun === 'rifle' && player.owned.rifle) ? 'rifle' : 'pistol';
  player.inv = Object.assign(
    { scrap: 0, tech: 0, snack: 0, mreBeef: 0, mreChicken: 0, gateKey: false, rifleBroken: 0 },
    p.inv || {});
  for (const k of ['scrap', 'tech', 'snack', 'mreBeef', 'mreChicken', 'rifleBroken'])
    player.inv[k] = Math.max(0, num(player.inv[k], 0));
  // transient state always starts clean
  player.dead = 0; player.iframes = 1; player.flash = 0;
  player.swing = 0; player.swingCd = 0; player.fireCd = 0; player.combatT = 99;
  player.reloadT = 0; player.reloadOf = null;
  player.burst = 0; player.burstT = 0; player.burstCd = 0; player.reloadWanted = false;

  mission.state = ['none', 'active', 'complete', 'turned'].includes(d.mission) ? d.mission : 'none';
  ScrapperStats.kills = Math.max(0, num(d.kills, 0));
  // saves written before the pity counter existed simply start it at zero
  ScrapperStats.techPity = Math.max(0, num(d.techPity, 0));
  if (d.bossDown) bossDefeated = true;
  if (d.campMap) campMapRead = true;

  // per-area world state: remember every area, then load the one we're in
  for (const id of Object.keys(d.areas || {})) areaState[id] = d.areas[id];
  const wantArea = d.area || 'junkyard';
  // Explored ground comes back first, and every area it names is photographed
  // for the world map. This leaves SOME area built — whichever was last in the
  // sweep — so the area the save is actually in is always rebuilt below, never
  // conditionally.
  loadFogAndThumbs(d.fog);
  currentArea = wantArea;
  Areas[wantArea].build();
  buildMinimap();
  loadAreaItems(currentArea);
  if (bossDefeated) openGate();
  restoreArea(currentArea);
  initFog(currentArea);

  // the position check must run against the AREA WE LOADED
  const inBounds2 = player.x > 1 && player.y > 1 && player.x < MAP_W - 1 && player.y < MAP_H - 1;
  if (!inBounds2 || !canStand(player.x, player.y, player.r)) {
    // The respawn point is only a safe fallback in the area it belongs to —
    // it used to be tested against 'junkyard' by name, which was the same
    // thing back when the shack was the only bed in the world.
    // AND THE LAST RESORT IS A REAL PLACE. It used to be the middle of the
    // map, which is a coordinate, not a location: on the Fringe that is the
    // east cross and on an indoor area it can be inside the stonework. Each
    // area names a tile it knows is standable, and the rescue lands there.
    const def = currentAreaDef();
    const safe = findSafeSpot(player.x, player.y) ||
      (currentArea === player.respawnArea
        ? { x: player.respawnX, y: player.respawnY }
        : (def.safeSpawn || { x: MAP_W / 2, y: MAP_H / 2 }));
    player.x = safe.x; player.y = safe.y;
  }

  Object.assign(Tut.done, d.tut || {});
  // robots re-enter fresh (never saved mid-chase)
  if (mission.state !== 'none' && currentAreaDef().hasScrapper) spawnScrappers();
  else scrappersOff();
  // raiders re-enter fresh too — standing at their posts, not mid-fight —
  // but the ones you already put down stay down. A save written before the
  // roadblocks existed simply has no list, and every post is manned.
  spawnBandits();
  restoreBandits(currentArea);
  // ...and the droid squads, for the same reason
  if (currentAreaDef().hasDroids) spawnFringeSquads();
  else clearDroids();
  foeBullets.length = 0;
  // And the camp. THIS WAS THE "sometimes the NPCs don't spawn" BUG: `folk` was
  // only ever built inside enterArea(), and loading a save does not go through
  // enterArea — it builds the area here. So quitting inside the church and
  // coming back gave you the room, the fires and the chests, and nobody in it.
  // Everyone who stands in an area is decided in this one place now.
  buildFolk(currentAreaDef().folk);

  // And last, because it has to read the finished state: settle anything a
  // milestone owes this run. See MILESTONE_GRANTS in js/items.js.
  granted = Object.assign({}, d.granted || {});
  grantMilestoneItems();
}

// Hand over everything this run is past the gate for and does not hold.
// Runs on every load. It is safe to do that because the ledger makes each
// entry a one-shot: a save written before an item existed has no ledger entry
// for it, gets it once, and is settled from then on.
function grantMilestoneItems() {
  if (typeof MILESTONE_GRANTS === 'undefined') return;
  const handed = [];
  for (const g of MILESTONE_GRANTS) {
    if (granted[g.id]) continue;         // already settled, whatever happened since
    if (!g.when()) continue;             // not past that stage yet
    granted[g.id] = 1;                   // settled either way, so this never repeats
    if (g.has && g.has()) continue;      // earned it the ordinary way; nothing owed
    g.give();
    handed.push(g.name);
  }
  if (handed.length) {
    // Say so. Something appearing in the pack unannounced reads as a bug.
    showMsg(handed.join('  ·  ') + '  — owed from earlier', 4);
    saveGame();
  }
  return handed;
}

// nearest open tile, spiralling outward.
//
// RADIUS 8 WAS NOT ENOUGH ONCE THE MAP GREW EDGES. Every one of the Fringe's
// four boundaries turned open ground into solid — the Ashfield alone is twenty
// columns deep — so a run saved standing at x 5 was fourteen tiles from the
// nearest tile it could stand on, this returned null, and the player was
// teleported to a hardcoded map centre. That is exactly the "saves must
// survive updates" rule failing: the run is not lost, but it wakes up
// somewhere it has never been. The search reaches across the widest edge now,
// and the ring is sampled finely enough at large r that a two-tile gap in a
// wall cannot be stepped over.
function findSafeSpot(x, y) {
  for (let r = 1; r <= 44; r++) {
    const rays = Math.max(16, Math.round(r * 6));
    for (let a = 0; a < rays; a++) {
      const ang = (a / rays) * Math.PI * 2;
      const nx = x + Math.cos(ang) * r, ny = y + Math.sin(ang) * r;
      if (nx > 1 && ny > 1 && nx < MAP_W - 1 && ny < MAP_H - 1 && canStand(nx, ny, 0.3)) {
        // AND NOT ONTO THE FIRE. The Ashfield's margin is walkable, so it
        // passes canStand — and a run rescued onto it would wake up already
        // burning, from a save that did nothing wrong. Standable is not the
        // same as safe.
        const by = burning[Math.floor(ny)];
        if (by && by[Math.floor(nx)]) continue;
        return { x: nx, y: ny };
      }
    }
  }
  return null;
}

// three exit hooks - browsers don't reliably fire any single one of these,
// but together they cover close, refresh, tab-switch and mobile kill
window.addEventListener('beforeunload', () => saveGame());
window.addEventListener('pagehide', () => saveGame());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveGame();
});

