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
  hasGun: false, ammo: 0,      // hasGun = pistol EQUIPPED
  active: 'melee',             // which equipped weapon LMB uses (scroll to switch)
  scrollHintT: 0,              // "scroll" HUD hint: 30s after getting the gun, then gone
  owned: { pipe: false, knife: false, pistol: false },
  inv: { scrap: 0, tech: 0, snack: 0, mreBeef: 0, mreChicken: 0, gateKey: false },
  respawnX: 6.5, respawnY: 26.5, homeSet: false,
};

// melee outranges the Scrapper's reach (1.15) — spacing is the skill.
// The knife punches through metal: higher damage, stabbing attack.
const MELEE = {
  pipe: { dmg: 7, cd: 0.55, range: 1.5, label: 'Metal pipe', stab: false },
  knife: { dmg: 18, cd: 0.4, range: 1.35, label: 'Piercing knife', stab: true },
};

// ---- staged tutorial: freezes the world briefly and explains one thing ----
const Tut = { active: null, done: {} };
function tutShow(id, lines, keys, footer) {
  if (Tut.done[id]) return;
  Tut.done[id] = true;
  Tut.active = { id, lines, keys, footer, grace: 0.3 };
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
}
loadAreaItems(currentArea);
// legacy alias used by the v1→v2 save migration
const START_ITEMS = START_ITEMS_BY_AREA.junkyard;

// pick an enemy spawn point tucked behind a trash mountain, away from the player
function pickSpawn() {
  const far = moundSpawns.filter(p => Math.hypot(p.x - player.x, p.y - player.y) > 9);
  const pool = far.length ? far : moundSpawns;
  if (pool.length) return pool[(Math.random() * pool.length) | 0];
  return { x: 24.5, y: 18.5 };
}

const scrapper = {
  spawnX: 24.5, spawnY: 18.5,
  x: 24.5, y: 18.5, r: 0.3,
  hp: 30, maxHp: 30,
  state: 'off', t: 0,          // 'off' until the survivor warns you about them
  tx: 24.5, ty: 18.5,
  animT: 0, frame: 0,
  hitFlash: 0, respawn: 0, didHit: false,
  kbx: 0, kby: 0,
  kills: 0, looted: false,
  detour: 0, detourX: 0, detourY: 0,   // makeshift brain: sidestep obstacles
  alert: 0, idleT: 0,                  // detection meter & patrol idle pause
  patrolFlip: false,                   // alternates heap ↔ central hub
  memory: 0, lastPX: 0, lastPY: 0,     // remembers a spotted player for 12s
};

function spawnScrapper() {
  const sp = pickSpawn();
  scrapper.x = sp.x; scrapper.y = sp.y;
  scrapper.hp = scrapper.maxHp;
  scrapper.looted = false;
  scrapper.detour = 0;
  scrapper.alert = 0;
  scrapper.idleT = 0;
  const p = patrolPoints[(Math.random() * patrolPoints.length) | 0] || { x: 16, y: 16 };
  scrapper.tx = p.x; scrapper.ty = p.y;
  scrapper.state = 'patrol';
}

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
    { key: 'bo', name: 'BO', x: 3.5, y: 6.5, lines: [
      "Don't touch that. Its cell is still hot.",
      "They come apart easier than they look. Everything does.",
      "I keep the eye lit while I work. Tells me there's still charge in it." ] },
    { key: 'ade', name: 'SISTER ADE', x: 9.5, y: 5.5, lines: [
      "You're not bleeding. Come back when you are.",
      "The name stuck because of the building. I was a vet's assistant.",
      "Two cots. One of them has been the same man for eleven days." ] },
    { key: 'halden', name: 'HALDEN', x: 9.5, y: 8.5, lines: [
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
};
function buildFolk(kind) {
  folk = (FOLK[kind] || []).map(f => Object.assign({ animT: 0, frame: 0, said: 0 }, f));
}
// one line at a time, in order, then round again — so talking to somebody
// twice is worth doing and talking to them nine times is not. An entry may be
// several lines: a trader needs room to say what he is before he sells it.
function talkToFolk(f) {
  const said = f.lines[f.said % f.lines.length];
  const lines = Array.isArray(said) ? said.slice() : [said];
  lines[0] = f.name + ': ' + lines[0];
  startDialog(lines);
  f.said++;
  SFX.uiOpen();
  // the counter opens when he has finished saying it, not over the top of it
  if (f.stock && STOCK[f.stock]) Trade.pending = { who: f.name, stock: STOCK[f.stock] };
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
  workbench: (p, ask) => ask ? 'E — look' : startDialog([
    "A Hunter-Killer with its casing off and one arm in the vice.",
    "The eye is still lit. Whatever is in there has charge left." ]),
  hearth: (p, ask) => ask ? 'E — look' : startDialog([
    "A drum with a fire in it and a flue punched through a boarded window.",
    "The first warm thing you have stood next to since the yard." ]),
};

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
}

const Dialog = { active: false, lines: [], idx: 0 };
function startDialog(lines) { Dialog.active = true; Dialog.lines = lines; Dialog.idx = 0; }

// The counter. It used to be one panel with Marek's three items written into
// the drawing code, which meant a second trader could not exist. Now the panel
// is empty furniture and whoever opened it supplies the stock.
const Trade = { open: false, who: 'SURVIVOR', stock: [], pending: null };
const InvUI = { open: false };

const mission = { state: 'none' };   // none -> active -> complete -> turned

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
      player.x = player.respawnX; player.y = player.respawnY;
      player.hp = player.maxHp; player.iframes = 1.2;
    }
    return;
  }

  // stepping into the shack claims it as your respawn point
  if (!player.homeSet && insideShack(player.x, player.y)) {
    player.homeSet = true;
    player.respawnX = 21.5; player.respawnY = 7.5;
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
  if (Input.mouseDown && player.fireCd <= 0 && player.hasGun && player.active === 'gun') {
    if (player.ammo > 0) {
      player.ammo--;
      player.combatT = 0;
      player.fireCd = 0.5; player.muzzle = 0.06;
      const dirW = screenToIso(Math.cos(player.angle), Math.sin(player.angle));
      const dl = Math.hypot(dirW.x, dirW.y);
      bullets.push({
        x: player.x + (dirW.x / dl) * 0.35, y: player.y + (dirW.y / dl) * 0.35,
        vx: (dirW.x / dl) * 13, vy: (dirW.y / dl) * 13, life: 0.5,
      });
      addShake(1.2);
      SFX.shot();
    } else {
      player.fireCd = 0.35;
      showMsg('OUT OF AMMO — scroll to your melee', 1.5);
      SFX.dry();
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
    if (scrapper.state !== 'dead') {
      const dx = scrapper.x - player.x, dy = scrapper.y - player.y;
      const d = Math.hypot(dx, dy);
      if (d < m.range) {
        const ss = isoToScreen(scrapper.x, scrapper.y);
        const a = Math.atan2(ss.y - ps.y, ss.x - ps.x);
        let diff = Math.abs(a - player.angle);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < 1.3) {
          scrapper.hp -= m.dmg;
          scrapper.hitFlash = 0.08;
          scrapper.kbx += (dx / (d || 1)) * 0.10;
          scrapper.kby += (dy / (d || 1)) * 0.10;
          spawnSparks(scrapper.x, scrapper.y, 6, ['#ffd27a', '#c9c9d2']);
          addShake(2);
          SFX.clang();
          if (scrapper.hp <= 0) killScrapper();
        }
      }
    }
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
  if (scrapper.state === 'dead' && !scrapper.looted) {
    consider(scrapper, 'wreck', Math.hypot(player.x - scrapper.x, player.y - scrapper.y), 1.1);
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
    const s = isoToScreen(scrapper.x, scrapper.y);
    Prompt = { sx: s.x, sy: s.y - 20, text: 'E — loot wreck' };
    if (Input.pressed['KeyE']) {
      Input.pressed['KeyE'] = false;
      const r = Math.random();
      const n = r < 0.5 ? 1 : r < 0.85 ? 2 : 3;   // small chance of a rich wreck
      player.inv.scrap += n;
      let extra = '';
      if (Math.random() < 0.2) { player.inv.tech++; extra = '  · +1 LOW-QUALITY tech component'; }
      showMsg(`Looted ${n} scrap${extra}`);
      spawnSparks(scrapper.x, scrapper.y, 5, ['#8a8a92', '#ffd27a']);
      if (extra) SFX.tech(); else SFX.loot();
      scrapper.looted = true;
      scrapper.respawn = Math.min(scrapper.respawn, 4);
      saveGame();
      tutShow('loot',
        ['Dead machines can be looted for scrap', 'and rare tech components.', 'Press I to open your pack.'],
        ['KeyI', 'Tab'], 'PRESS I');
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
        player.ammo += best.amount;
        showMsg(`+${best.amount} rounds`);
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
    spawnScrapper();             // his warning is what wakes the yard up
    saveGame();
  } else if (mission.state === 'active') {
    startDialog(["Smash the Scrappers. Bring me 5 scrap."]);
  } else if (mission.state === 'complete') {
    startDialog([
      "Ha. Not bad for a corpse.",
      "Take this — my old sidearm. Six rounds in the mag.",
      "And these — keys to the yard gate.",
      "When you're ready, the city waits beyond it.",
      "Bring me scrap meanwhile — I trade. Food, rounds, steel.",
    ]);
    mission.state = 'turned';
    player.owned.pistol = true;
    player.hasGun = true;
    player.active = 'gun';
    player.scrollHintT = 30;
    player.ammo += 6;
    player.inv.gateKey = true;
    showMsg('SCRAP PISTOL + YARD GATE KEY acquired', 3.5);
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
const STOCK = {
  marek: [
    { label: 'snack bar', icon: () => Sprites.snackIcon, cost: { scrap: 4 },
      buy: () => { player.inv.snack++; showMsg('Bought a snack bar  (H to eat)'); } },
    { label: '6 rounds', icon: () => Sprites.ammo, cost: { scrap: 6 },
      buy: () => { player.ammo += 6; showMsg('Bought 6 rounds'); } },
    { label: 'piercing knife', icon: () => Sprites.knifeIcon, cost: { tech: 2 },
      sold: () => player.owned.knife,
      buy: () => {
        player.owned.knife = true; player.melee = 'knife';
        showMsg('PIERCING KNIFE acquired');
      } },
  ],
  // Tam's counter. Rations and rounds, and one tech part at a price that says
  // he knows exactly what it is worth to somebody carrying a scrap pistol.
  tam: [
    { label: '8 rifle rounds', icon: () => Sprites.ammo, cost: { scrap: 5 },
      buy: () => { player.ammo += 8; showMsg('Bought 8 rounds'); } },
    { label: 'beef MRE', icon: () => Sprites.mreBeef, cost: { scrap: 6 },
      buy: () => { player.inv.mreBeef++; showMsg('Bought a beef MRE  (H to eat)'); } },
    { label: 'chicken MRE', icon: () => Sprites.mreChicken, cost: { scrap: 4 },
      buy: () => { player.inv.mreChicken++; showMsg('Bought a chicken MRE  (H to eat)'); } },
    { label: 'low-q tech part', icon: () => Sprites.techIcon, cost: { scrap: 9 },
      buy: () => { player.inv.tech++; showMsg('Bought a low-quality tech component'); } },
  ],
};
const COST_NAME = { scrap: 'scrap', tech: 'low-q tech' };
const canAfford = (row) => Object.keys(row.cost).every(k => player.inv[k] >= row.cost[k]);
const costText = (row) => Object.keys(row.cost)
  .map(k => row.cost[k] + ' ' + COST_NAME[k]).join(' + ');

function openTrade(who, stock) {
  Trade.open = true; Trade.who = who; Trade.stock = stock; Trade.pending = null;
  SFX.uiOpen();
}

function tradeBuy(n) {
  const row = Trade.stock[n - 1];
  if (!row) return;
  if (row.sold && row.sold()) { showMsg('Already sold', 1.5); SFX.deny(); return; }
  if (!canAfford(row)) { showMsg('Not enough — ' + costText(row), 1.6); SFX.deny(); return; }
  for (const k of Object.keys(row.cost)) player.inv[k] -= row.cost[k];
  row.buy();
  SFX.buy();
  saveGame();                    // every purchase is committed instantly
}

function updateMission() {
  if (mission.state === 'active' && scrapper.kills >= 1 && player.inv.scrap >= 5) {
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
  // shreds machines — a well-placed barrel one-shots a Scrapper
  if (scrapper.state !== 'off' && scrapper.state !== 'dead') {
    const sd = Math.hypot(scrapper.x - cx, scrapper.y - cy);
    if (sd < R) {
      scrapper.hp -= Math.round(30 + 60 * (1 - sd / R));
      scrapper.hitFlash = 0.1;
      scrapper.alert = 1;               // survivors of the blast come for you
      if (scrapper.hp <= 0) killScrapper();
      else scrapper.state = 'chase';
    }
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
      bossHit(b.x, b.y, 10, 'bullet');
    }
    if (!hit && scrapper.state !== 'dead' && Math.hypot(b.x - scrapper.x, b.y - scrapper.y) < 0.45) {
      hit = true;
      scrapper.hp -= 10;
      scrapper.hitFlash = 0.08;
      scrapper.kbx += b.vx * 0.02; scrapper.kby += b.vy * 0.02;
      spawnSparks(b.x, b.y, 6, ['#ffd27a', '#ffb02e', '#8a8a92']);
      addShake(0.8);
      SFX.hitMetal();
      if (scrapper.hp <= 0) killScrapper();
    }
    if (hit) bullets.splice(i, 1);
  }
}

function killScrapper() {
  scrapper.state = 'dead';
  scrapper.looted = false;
  scrapper.respawn = 20;        // lingers as a lootable wreck; 4s after looting
  scrapper.kills++;
  SFX.robotDie();
  addShake(2.5);
  spawnSparks(scrapper.x, scrapper.y, 12, ['#ffd27a', '#ffb02e', '#8a8a92'], 3);
  spawnSmoke(scrapper.x, scrapper.y, 5);
}

function updateScrapper(dt) {
  const s = scrapper;
  if (s.state === 'off') return;      // yard is quiet until the NPC's warning
  if (!currentAreaDef().hasScrapper) return;
  s.hitFlash -= dt;
  if (s.kbx || s.kby) {
    tryMove(s, s.kbx, s.kby);
    s.kbx *= 0.7; s.kby *= 0.7;
    if (Math.abs(s.kbx) + Math.abs(s.kby) < 0.001) { s.kbx = 0; s.kby = 0; }
  }

  if (s.state === 'dead') {
    s.respawn -= dt;
    if (s.respawn <= 0) spawnScrapper();
    return;
  }

  const playerSafe = insideShack(player.x, player.y);
  const distP = Math.hypot(player.x - s.x, player.y - s.y);
  s.animT += dt;
  if (s.animT > 0.22) { s.animT = 0; s.frame = 1 - s.frame; }

  switch (s.state) {
    case 'patrol': {
      // gradual detection: machines don't magically know where you are.
      // Their sight (4.5) is shorter than yours; crouching shrinks it to 2.2
      // — but up close (<1.6) they see you no matter what.
      const sightR = player.crouch ? 2.2 : 4.5;
      if (player.dead <= 0 && !playerSafe) {
        if (distP < 1.6) s.alert = 1;
        else if (distP < sightR) s.alert += dt * (0.5 + 1.6 * (1 - distP / sightR));
        else s.alert = Math.max(0, s.alert - dt * 0.5);
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
      // walk heap to heap, pausing to "scan"
      if (s.idleT > 0) { s.idleT -= dt; break; }
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
      const seesYou = !playerSafe && player.dead <= 0 && distP < 7.5;
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
