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
        respawnX: player.respawnX, respawnY: player.respawnY, homeSet: player.homeSet,
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
  for (const id of Object.keys(exploredByArea)) out[id] = fogToString(exploredByArea[id]);
  return out;
}

// every area's remembered state, with the live area folded in
function collectAreaState() {
  const all = {};
  for (const id of Object.keys(areaState)) all[id] = areaState[id];
  all[currentArea] = {
    deadBarrels: boomBarrels.filter(b => !b.alive).map(b => b.gx + ',' + b.gy),
    takenItems: (START_ITEMS_BY_AREA[currentArea] || []).filter(
      k => !items.some(it => itemKey(it) === k)),
    deadBandits: collectDeadBandits(),
  };
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

function wipeSave() {
  try { localStorage.removeItem(saveKey()); } catch (e) {}
  // a new run owes nothing — otherwise starting over in the same page session
  // would carry the last run's ledger and quietly skip its back-payments
  granted = {};
  // and it certainly does not start with the last run's parts on its rifle
  player.mods = freshMods();
  modsChanged();
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
      A.loaded = Math.max(0, Math.min(cap, num(src.loaded, 0)));
      A.reserve = Math.max(0, num(src.reserve, 0));
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
  player.burst = 0; player.burstT = 0; player.reloadWanted = false;

  mission.state = ['none', 'active', 'complete', 'turned'].includes(d.mission) ? d.mission : 'none';
  ScrapperStats.kills = Math.max(0, num(d.kills, 0));
  // saves written before the pity counter existed simply start it at zero
  ScrapperStats.techPity = Math.max(0, num(d.techPity, 0));
  if (d.bossDown) bossDefeated = true;
  if (d.campMap) campMapRead = true;

  // per-area world state: remember every area, then load the one we're in
  for (const id of Object.keys(d.areas || {})) areaState[id] = d.areas[id];
  const wantArea = d.area || 'junkyard';
  if (wantArea !== currentArea) {
    currentArea = wantArea;
    Areas[wantArea].build();
    buildMinimap();
  }
  loadAreaItems(currentArea);
  if (bossDefeated) openGate();
  restoreArea(currentArea);
  // explored ground comes back with the run
  if (d.fog) {
    for (const id of Object.keys(d.fog)) {
      const def = Areas[id];
      if (!def) continue;
      const w = id === currentArea ? MAP_W : (id === 'fringe' ? FRINGE_W : 32);
      const h = id === currentArea ? MAP_H : (id === 'fringe' ? FRINGE_H : 32);
      const len = Math.ceil(w / FOG) * Math.ceil(h / FOG);
      exploredByArea[id] = fogFromString(d.fog[id], len);
    }
  }
  initFog(currentArea);

  // the position check must run against the AREA WE LOADED
  const inBounds2 = player.x > 1 && player.y > 1 && player.x < MAP_W - 1 && player.y < MAP_H - 1;
  if (!inBounds2 || !canStand(player.x, player.y, player.r)) {
    const safe = findSafeSpot(player.x, player.y) ||
      (currentArea === 'junkyard' ? { x: player.respawnX, y: player.respawnY } : { x: MAP_W / 2, y: MAP_H / 2 });
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

// nearest open tile, spiralling outward
function findSafeSpot(x, y) {
  for (let r = 1; r <= 8; r++) {
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      const nx = x + Math.cos(ang) * r, ny = y + Math.sin(ang) * r;
      if (nx > 1 && ny > 1 && nx < MAP_W - 1 && ny < MAP_H - 1 && canStand(nx, ny, 0.3)) {
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

